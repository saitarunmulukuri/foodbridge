"""Unit tests for the Donation Request module — Sprint 4.1.

Test Coverage:
    - Permissions (require_ngo_role)
    - Validators (validate_decline_reason)
    - DeclineRequestSchema (optional field, read-only exclusion)
    - DonationRequestService:
        - list_my_requests
        - get_request (ownership verification)
        - accept_request (full atomic flow)
        - decline_request
    - Business rules:
        - Terminal-state guard
        - Expiry check
        - Ownership violation
        - Competing request cancellation
        - Donation status transition
        - Rollback on commit failure
"""

import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import MagicMock, patch, call

# ORM model imports — required to configure SQLAlchemy mapper registry
from backend.modules.authentication.models import User
from backend.modules.donors.models import Donor
from backend.modules.ngos.models import NGO, NGODailyCapacity, NGORequest, NGORequestHistory
from backend.modules.volunteers.models import Volunteer, VolunteerAssignment, AssignmentHistory
from backend.modules.donations.models import (
    Donation, DonationItem, DecisionEngineRun, RecommendationCycle, DonationStatusHistory,
)
from backend.modules.notifications.models import Notification

from backend.modules.donation_requests.exceptions import (
    DonationRequestAlreadyResolvedException,
    DonationRequestExpiredException,
    DonationRequestForbiddenException,
    DonationRequestNotFoundException,
    InsufficientRoleException,
)
from backend.modules.donation_requests.permissions import require_ngo_role
from backend.modules.donation_requests.repositories import DonationRequestRepository
from backend.modules.donation_requests.schemas import DeclineRequestSchema
from backend.modules.donation_requests.services import DonationRequestService
from backend.modules.donation_requests.validators import validate_decline_reason
from backend.modules.ngos.exceptions import NGONotFoundException
from backend.shared.constants.enums import DonationStatus, RequestStatus
from marshmallow import ValidationError


# -----------------------------------------------------------------------
# Helper factories
# -----------------------------------------------------------------------

_FUTURE = datetime.now(timezone.utc) + timedelta(hours=24)
_PAST = datetime.now(timezone.utc) - timedelta(hours=1)


def _make_ngo(ngo_id: int = 1, user_id: int = 10) -> MagicMock:
    ngo = MagicMock(spec=NGO)
    ngo.ngo_id = ngo_id
    ngo.user_id = user_id
    return ngo


def _make_donation(donation_id: int = 100, status=DonationStatus.SUBMITTED) -> MagicMock:
    d = MagicMock(spec=Donation)
    d.donation_id = donation_id
    d.status = status
    return d


def _make_cycle(cycle_id: int = 200, donation_id: int = 100) -> MagicMock:
    cycle = MagicMock(spec=RecommendationCycle)
    cycle.recommendation_cycle_id = cycle_id
    cycle.donation_id = donation_id
    cycle.donation = _make_donation(donation_id)
    return cycle


def _make_request(
    request_id: int = 1,
    ngo_id: int = 1,
    cycle_id: int = 200,
    status: RequestStatus = RequestStatus.PENDING,
    deadline=None,
    score: Decimal = Decimal("85.00"),
    rank: int = 1,
) -> MagicMock:
    req = MagicMock(spec=NGORequest)
    req.ngo_request_id = request_id
    req.ngo_id = ngo_id
    req.recommendation_cycle_id = cycle_id
    req.recommendation_cycle = _make_cycle(cycle_id)
    req.status = status
    req.response_deadline = deadline if deadline is not None else _FUTURE
    req.recommendation_score = score
    req.recommendation_rank = rank
    req.responded_at = None
    req.rejection_reason = None
    req.created_at = datetime.now(timezone.utc)
    req.updated_at = None
    return req


def _make_service(
    ngo=None,
    requests=None,
    single_request=None,
    competing=None,
):
    mock_repo = MagicMock(spec=DonationRequestRepository)
    mock_repo.find_ngo_by_user_id.return_value = ngo
    if requests is not None:
        mock_repo.find_requests_for_ngo.return_value = requests
    if single_request is not None:
        mock_repo.find_request_by_id.return_value = single_request
    if competing is not None:
        mock_repo.find_pending_requests_for_cycle.return_value = competing
    else:
        mock_repo.find_pending_requests_for_cycle.return_value = []
    mock_repo.accept_request.side_effect = lambda r: r
    mock_repo.decline_request.side_effect = lambda r, reason: r
    mock_repo.cancel_competing_requests.return_value = 0
    mock_repo.set_donation_status.side_effect = lambda d, s: d
    return DonationRequestService(repository=mock_repo), mock_repo


# -----------------------------------------------------------------------
# Tests: Permissions
# -----------------------------------------------------------------------


class TestDonationRequestPermissions(unittest.TestCase):
    def test_ngo_role_passes(self):
        require_ngo_role(1, "NGO")  # must not raise

    def test_donor_role_rejected(self):
        with self.assertRaises(InsufficientRoleException):
            require_ngo_role(1, "DONOR")

    def test_volunteer_role_rejected(self):
        with self.assertRaises(InsufficientRoleException):
            require_ngo_role(1, "VOLUNTEER")

    def test_admin_role_rejected(self):
        with self.assertRaises(InsufficientRoleException):
            require_ngo_role(1, "ADMIN")

    def test_empty_role_rejected(self):
        with self.assertRaises(InsufficientRoleException):
            require_ngo_role(1, "")


# -----------------------------------------------------------------------
# Tests: Validators
# -----------------------------------------------------------------------


class TestDeclineReasonValidator(unittest.TestCase):
    def test_valid_reason(self):
        validate_decline_reason("Capacity full this week.")

    def test_empty_reason_rejected(self):
        with self.assertRaises(ValidationError):
            validate_decline_reason("")

    def test_whitespace_only_rejected(self):
        with self.assertRaises(ValidationError):
            validate_decline_reason("   ")

    def test_too_long_rejected(self):
        with self.assertRaises(ValidationError):
            validate_decline_reason("x" * 1001)

    def test_exactly_1000_chars_accepted(self):
        validate_decline_reason("x" * 1000)


# -----------------------------------------------------------------------
# Tests: DeclineRequestSchema
# -----------------------------------------------------------------------


class TestDeclineRequestSchema(unittest.TestCase):
    def setUp(self):
        self.schema = DeclineRequestSchema()

    def test_valid_with_reason(self):
        data = self.schema.load({"decline_reason": "Cannot accept."})
        self.assertEqual(data["decline_reason"], "Cannot accept.")

    def test_empty_payload_defaults_to_none(self):
        data = self.schema.load({})
        self.assertIsNone(data["decline_reason"])

    def test_unknown_fields_excluded(self):
        data = self.schema.load({
            "decline_reason": "No capacity.",
            "ngo_id": 99,
            "hack": "injection",
        })
        self.assertNotIn("ngo_id", data)
        self.assertNotIn("hack", data)


# -----------------------------------------------------------------------
# Tests: DonationRequestService — List
# -----------------------------------------------------------------------


class TestDonationRequestServiceList(unittest.TestCase):
    def test_list_returns_all_requests(self):
        ngo = _make_ngo()
        reqs = [_make_request(request_id=1), _make_request(request_id=2)]
        service, _ = _make_service(ngo=ngo, requests=reqs)
        result = service.list_my_requests(user_id=10, role="NGO")
        self.assertEqual(result["total"], 2)
        self.assertEqual(len(result["requests"]), 2)

    def test_list_empty_returns_zero(self):
        ngo = _make_ngo()
        service, _ = _make_service(ngo=ngo, requests=[])
        result = service.list_my_requests(user_id=10, role="NGO")
        self.assertEqual(result["total"], 0)

    def test_list_wrong_role_raises(self):
        service, _ = _make_service()
        with self.assertRaises(InsufficientRoleException):
            service.list_my_requests(user_id=1, role="DONOR")

    def test_list_ngo_not_found_raises(self):
        service, _ = _make_service(ngo=None)
        with self.assertRaises(NGONotFoundException):
            service.list_my_requests(user_id=99, role="NGO")


# -----------------------------------------------------------------------
# Tests: DonationRequestService — Get
# -----------------------------------------------------------------------


class TestDonationRequestServiceGet(unittest.TestCase):
    def test_get_returns_request(self):
        ngo = _make_ngo(ngo_id=1)
        req = _make_request(request_id=10, ngo_id=1)
        service, _ = _make_service(ngo=ngo, single_request=req)
        result = service.get_request(user_id=10, role="NGO", request_id=10)
        self.assertEqual(result["request_id"], 10)

    def test_get_wrong_role_raises(self):
        service, _ = _make_service()
        with self.assertRaises(InsufficientRoleException):
            service.get_request(user_id=1, role="VOLUNTEER", request_id=1)

    def test_get_not_found_raises(self):
        ngo = _make_ngo()
        service, mock_repo = _make_service(ngo=ngo)
        mock_repo.find_request_by_id.return_value = None
        with self.assertRaises(DonationRequestNotFoundException):
            service.get_request(user_id=10, role="NGO", request_id=999)

    def test_get_wrong_ngo_raises_forbidden(self):
        ngo = _make_ngo(ngo_id=1)
        req = _make_request(request_id=5, ngo_id=2)  # belongs to ngo_id=2
        service, _ = _make_service(ngo=ngo, single_request=req)
        with self.assertRaises(DonationRequestForbiddenException):
            service.get_request(user_id=10, role="NGO", request_id=5)


# -----------------------------------------------------------------------
# Tests: DonationRequestService — Accept
# -----------------------------------------------------------------------


class TestDonationRequestServiceAccept(unittest.TestCase):
    def test_accept_pending_request_succeeds(self):
        ngo = _make_ngo(ngo_id=1)
        req = _make_request(request_id=1, ngo_id=1, status=RequestStatus.PENDING)
        competing = [_make_request(request_id=2, ngo_id=5)]
        service, mock_repo = _make_service(ngo=ngo, single_request=req, competing=competing)

        with patch("backend.modules.donation_requests.services.db") as mock_db:
            result = service.accept_request(user_id=10, role="NGO", request_id=1)

        mock_repo.accept_request.assert_called_once_with(req)
        mock_repo.set_donation_status.assert_called_once()
        mock_repo.cancel_competing_requests.assert_called_once_with(competing)
        mock_db.session.commit.assert_called_once()

    def test_accept_status_field_is_accepted(self):
        ngo = _make_ngo()
        req = _make_request(ngo_id=1)
        # After accept, status mock mutates to ACCEPTED
        req.status = RequestStatus.ACCEPTED
        service, _ = _make_service(ngo=ngo, single_request=req)
        with patch("backend.modules.donation_requests.services.db"):
            result = service.accept_request(user_id=10, role="NGO", request_id=1)
        self.assertEqual(result["status"], "ACCEPTED")

    def test_accept_already_accepted_raises(self):
        ngo = _make_ngo()
        req = _make_request(ngo_id=1, status=RequestStatus.ACCEPTED)
        service, _ = _make_service(ngo=ngo, single_request=req)
        with self.assertRaises(DonationRequestAlreadyResolvedException):
            service.accept_request(user_id=10, role="NGO", request_id=1)

    def test_accept_already_rejected_raises(self):
        ngo = _make_ngo()
        req = _make_request(ngo_id=1, status=RequestStatus.REJECTED)
        service, _ = _make_service(ngo=ngo, single_request=req)
        with self.assertRaises(DonationRequestAlreadyResolvedException):
            service.accept_request(user_id=10, role="NGO", request_id=1)

    def test_accept_auto_cancelled_raises(self):
        ngo = _make_ngo()
        req = _make_request(ngo_id=1, status=RequestStatus.AUTO_CANCELLED)
        service, _ = _make_service(ngo=ngo, single_request=req)
        with self.assertRaises(DonationRequestAlreadyResolvedException):
            service.accept_request(user_id=10, role="NGO", request_id=1)

    def test_accept_expired_deadline_raises(self):
        ngo = _make_ngo()
        req = _make_request(ngo_id=1, status=RequestStatus.PENDING, deadline=_PAST)
        service, _ = _make_service(ngo=ngo, single_request=req)
        with self.assertRaises(DonationRequestExpiredException):
            service.accept_request(user_id=10, role="NGO", request_id=1)

    def test_accept_rollback_on_commit_failure(self):
        ngo = _make_ngo()
        req = _make_request(ngo_id=1, status=RequestStatus.PENDING)
        service, _ = _make_service(ngo=ngo, single_request=req)
        with patch("backend.modules.donation_requests.services.db") as mock_db:
            mock_db.session.commit.side_effect = RuntimeError("DB down")
            with self.assertRaises(RuntimeError):
                service.accept_request(user_id=10, role="NGO", request_id=1)
            mock_db.session.rollback.assert_called_once()


# -----------------------------------------------------------------------
# Tests: DonationRequestService — Decline
# -----------------------------------------------------------------------


class TestDonationRequestServiceDecline(unittest.TestCase):
    def test_decline_pending_request_succeeds(self):
        ngo = _make_ngo()
        req = _make_request(ngo_id=1, status=RequestStatus.PENDING)
        service, mock_repo = _make_service(ngo=ngo, single_request=req)
        with patch("backend.modules.donation_requests.services.db") as mock_db:
            result = service.decline_request(
                user_id=10, role="NGO", request_id=1, decline_reason="Capacity full."
            )
        mock_repo.decline_request.assert_called_once_with(req, "Capacity full.")
        mock_db.session.commit.assert_called_once()

    def test_decline_without_reason_succeeds(self):
        ngo = _make_ngo()
        req = _make_request(ngo_id=1, status=RequestStatus.PENDING)
        service, mock_repo = _make_service(ngo=ngo, single_request=req)
        with patch("backend.modules.donation_requests.services.db"):
            result = service.decline_request(
                user_id=10, role="NGO", request_id=1, decline_reason=None
            )
        mock_repo.decline_request.assert_called_once_with(req, None)

    def test_decline_already_resolved_raises(self):
        ngo = _make_ngo()
        req = _make_request(ngo_id=1, status=RequestStatus.TIMED_OUT)
        service, _ = _make_service(ngo=ngo, single_request=req)
        with self.assertRaises(DonationRequestAlreadyResolvedException):
            service.decline_request(user_id=10, role="NGO", request_id=1, decline_reason=None)

    def test_decline_expired_deadline_raises(self):
        ngo = _make_ngo()
        req = _make_request(ngo_id=1, status=RequestStatus.PENDING, deadline=_PAST)
        service, _ = _make_service(ngo=ngo, single_request=req)
        with self.assertRaises(DonationRequestExpiredException):
            service.decline_request(user_id=10, role="NGO", request_id=1, decline_reason=None)

    def test_decline_rollback_on_commit_failure(self):
        ngo = _make_ngo()
        req = _make_request(ngo_id=1, status=RequestStatus.PENDING)
        service, _ = _make_service(ngo=ngo, single_request=req)
        with patch("backend.modules.donation_requests.services.db") as mock_db:
            mock_db.session.commit.side_effect = RuntimeError("DB error")
            with self.assertRaises(RuntimeError):
                service.decline_request(user_id=10, role="NGO", request_id=1, decline_reason=None)
            mock_db.session.rollback.assert_called_once()


# -----------------------------------------------------------------------
# Tests: Status display mapping
# -----------------------------------------------------------------------


class TestStatusDisplayMapping(unittest.TestCase):
    """Test that ORM status values are mapped to sprint API display statuses."""

    def _serialize_status(self, orm_status: RequestStatus) -> str:
        ngo = _make_ngo()
        req = _make_request(ngo_id=1, status=orm_status)
        service, _ = _make_service(ngo=ngo, requests=[req])
        result = service.list_my_requests(user_id=10, role="NGO")
        return result["requests"][0]["status"]

    def test_pending_displayed_as_pending(self):
        self.assertEqual(self._serialize_status(RequestStatus.PENDING), "PENDING")

    def test_accepted_displayed_as_accepted(self):
        self.assertEqual(self._serialize_status(RequestStatus.ACCEPTED), "ACCEPTED")

    def test_rejected_displayed_as_declined(self):
        self.assertEqual(self._serialize_status(RequestStatus.REJECTED), "DECLINED")

    def test_timed_out_displayed_as_expired(self):
        self.assertEqual(self._serialize_status(RequestStatus.TIMED_OUT), "EXPIRED")

    def test_auto_cancelled_displayed_as_cancelled(self):
        self.assertEqual(self._serialize_status(RequestStatus.AUTO_CANCELLED), "CANCELLED")


if __name__ == "__main__":
    unittest.main()
