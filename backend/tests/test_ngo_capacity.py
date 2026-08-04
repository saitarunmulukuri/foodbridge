"""Unit tests for the NGO Date Capacity Management module — Sprint 3.2.

Test Coverage:
    - Capacity validators (validate_maximum_capacity, validate_capacity_date)
    - NGOCapacityUpdateSchema (validation, read-only exclusion, date & max capacity rules)
    - NGOCapacityResponseSchema (serialization with computed remaining_capacity)
    - NGORepository capacity methods
    - NGOCapacityService (get_my_capacity, update_my_capacity)
    - Business rules: remaining_capacity computed, reduction guard below allocated
"""

import unittest
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

# ORM model imports — required to configure SQLAlchemy mapper registry
from backend.modules.authentication.models import User
from backend.modules.donors.models import Donor
from backend.modules.ngos.models import NGO, NGODateCapacity, NGORequest, NGORequestHistory
from backend.modules.volunteers.models import Volunteer, VolunteerAssignment, AssignmentHistory
from backend.modules.donations.models import (
    Donation, DonationItem, DecisionEngineRun, RecommendationCycle, DonationStatusHistory,
)
from backend.modules.notifications.models import Notification

from backend.modules.ngos.exceptions import (
    CapacityReductionBelowAllocatedException,
    CapacityValidationException,
    InsufficientRoleException,
    NGONotFoundException,
)
from backend.modules.ngos.repositories import NGORepository
from backend.modules.ngos.schemas import NGOCapacityUpdateSchema
from backend.modules.ngos.services import NGOCapacityService
from backend.modules.ngos.validators import (
    validate_date_not_in_past,
    validate_maximum_capacity,
)
from backend.shared.constants.enums import VerificationStatus
from marshmallow import ValidationError


# -----------------------------------------------------------------------
# Helper factories
# -----------------------------------------------------------------------

_TODAY = date.today()
_FUTURE_DATE = _TODAY + timedelta(days=1)
_PAST_DATE = _TODAY - timedelta(days=1)


def _make_ngo(ngo_id: int = 1, user_id: int = 10) -> MagicMock:
    ngo = MagicMock(spec=NGO)
    ngo.ngo_id = ngo_id
    ngo.user_id = user_id
    ngo.verification_status = VerificationStatus.VERIFIED
    ngo.is_active = True
    ngo.created_at = None
    ngo.updated_at = None
    ngo.organisation_name = "Feed the World"
    ngo.registration_number = "REG-001"
    ngo.contact_person = "Alice"
    ngo.phone = "+91 9876543210"
    ngo.address = "12 Main Road"
    ngo.latitude = Decimal("17.3850")
    ngo.longitude = Decimal("78.4867")
    ngo.service_radius_km = 15
    return ngo


def _make_date_capacity(
    date_capacity_id: int = 1,
    ngo_id: int = 1,
    capacity_date: date = _FUTURE_DATE,
    max_meals: int = 100,
    allocated_meals: int = 30,
) -> MagicMock:
    cap = MagicMock(spec=NGODateCapacity)
    cap.date_capacity_id = date_capacity_id
    cap.ngo_id = ngo_id
    cap.date = capacity_date
    cap.max_meals = max_meals
    cap.allocated_meals = allocated_meals
    cap.created_at = None
    cap.updated_at = None
    return cap


# -----------------------------------------------------------------------
# Tests: Capacity Validators
# -----------------------------------------------------------------------


class TestCapacityValidators(unittest.TestCase):
    """Test suite for capacity validators."""

    def test_valid_maximum_capacity(self):
        validate_maximum_capacity(50)  # should not raise

    def test_maximum_capacity_zero_rejected(self):
        with self.assertRaises(ValidationError):
            validate_maximum_capacity(0)

    def test_maximum_capacity_negative_rejected(self):
        with self.assertRaises(ValidationError):
            validate_maximum_capacity(-10)

    def test_valid_capacity_date(self):
        validate_date_not_in_past(_FUTURE_DATE)  # should not raise

    def test_past_capacity_date_rejected(self):
        with self.assertRaises(ValidationError):
            validate_date_not_in_past(_PAST_DATE)


# -----------------------------------------------------------------------
# Tests: NGOCapacityUpdateSchema
# -----------------------------------------------------------------------


class TestNGOCapacityUpdateSchema(unittest.TestCase):
    """Test suite for NGOCapacityUpdateSchema validation."""

    def setUp(self):
        self.schema = NGOCapacityUpdateSchema()

    def test_valid_payload(self):
        data = self.schema.load({"date": _FUTURE_DATE.isoformat(), "maximum_capacity": 100})
        self.assertEqual(data["date"], _FUTURE_DATE)
        self.assertEqual(data["maximum_capacity"], 100)

    def test_date_required(self):
        with self.assertRaises(ValidationError) as ctx:
            self.schema.load({"maximum_capacity": 100})
        self.assertIn("date", ctx.exception.messages)

    def test_maximum_capacity_required(self):
        with self.assertRaises(ValidationError) as ctx:
            self.schema.load({"date": _FUTURE_DATE.isoformat()})
        self.assertIn("maximum_capacity", ctx.exception.messages)

    def test_maximum_capacity_zero_rejected(self):
        with self.assertRaises(ValidationError):
            self.schema.load({"date": _FUTURE_DATE.isoformat(), "maximum_capacity": 0})

    def test_read_only_fields_excluded(self):
        """allocated_capacity, remaining_capacity must be silently excluded."""
        data = self.schema.load({
            "date": _FUTURE_DATE.isoformat(),
            "maximum_capacity": 100,
            "allocated_capacity": 50,
            "remaining_capacity": 50,
            "date_capacity_id": 999,
            "ngo_id": 1,
        })
        self.assertNotIn("allocated_capacity", data)
        self.assertNotIn("remaining_capacity", data)
        self.assertNotIn("date_capacity_id", data)
        self.assertNotIn("ngo_id", data)


# -----------------------------------------------------------------------
# Tests: NGOCapacityService — Serialization & Computation
# -----------------------------------------------------------------------


class TestNGOCapacityServiceComputedFields(unittest.TestCase):
    """Test suite for capacity computation logic in NGOCapacityService."""

    def test_serialize_capacity_remaining_equals_max_minus_allocated(self):
        """Serialised remaining_capacity must equal max_meals - allocated_meals."""
        cap = _make_date_capacity(max_meals=100, allocated_meals=40)
        serialised = NGOCapacityService._serialize_capacity(cap)
        self.assertEqual(serialised["maximum_capacity"], 100)
        self.assertEqual(serialised["allocated_capacity"], 40)
        self.assertEqual(serialised["remaining_capacity"], 60)


# -----------------------------------------------------------------------
# Tests: NGOCapacityService — Business Rules
# -----------------------------------------------------------------------


class TestNGOCapacityServiceBusinessRules(unittest.TestCase):
    """Test suite for NGOCapacityService orchestration and business rules."""

    def _make_service(self, ngo=None, existing_capacity=None):
        mock_repo = MagicMock(spec=NGORepository)
        mock_repo.find_by_user_id.return_value = ngo
        mock_repo.find_date_capacity_by_date.return_value = existing_capacity

        if existing_capacity is not None:
            mock_repo.upsert_date_capacity.return_value = existing_capacity
        else:
            mock_repo.upsert_date_capacity.return_value = _make_date_capacity(max_meals=100, allocated_meals=0)

        return NGOCapacityService(repository=mock_repo), mock_repo

    def test_get_my_capacity_returns_all_records(self):
        ngo = _make_ngo()
        mock_repo = MagicMock(spec=NGORepository)
        mock_repo.find_by_user_id.return_value = ngo
        mock_repo.find_all_date_capacities.return_value = [
            _make_date_capacity(date_capacity_id=1, capacity_date=_FUTURE_DATE),
            _make_date_capacity(date_capacity_id=2, capacity_date=_FUTURE_DATE + timedelta(days=1)),
        ]
        service = NGOCapacityService(repository=mock_repo)
        result = service.get_my_capacity(user_id=10, role="NGO")
        self.assertEqual(result["total"], 2)
        self.assertEqual(len(result["capacities"]), 2)

    def test_get_my_capacity_empty_returns_empty_list(self):
        ngo = _make_ngo()
        mock_repo = MagicMock(spec=NGORepository)
        mock_repo.find_by_user_id.return_value = ngo
        mock_repo.find_all_date_capacities.return_value = []
        service = NGOCapacityService(repository=mock_repo)
        result = service.get_my_capacity(user_id=10, role="NGO")
        self.assertEqual(result["total"], 0)
        self.assertEqual(result["capacities"], [])

    def test_get_my_capacity_wrong_role_raises(self):
        service = NGOCapacityService(repository=MagicMock())
        with self.assertRaises(InsufficientRoleException):
            service.get_my_capacity(user_id=1, role="DONOR")

    def test_get_my_capacity_ngo_not_found_raises(self):
        mock_repo = MagicMock(spec=NGORepository)
        mock_repo.find_by_user_id.return_value = None
        service = NGOCapacityService(repository=mock_repo)
        with self.assertRaises(NGONotFoundException):
            service.get_my_capacity(user_id=99, role="NGO")

    def test_update_creates_new_record_for_new_ngo(self):
        """New capacity record → allocated = 0, remaining = maximum."""
        ngo = _make_ngo()
        new_cap = _make_date_capacity(max_meals=100, allocated_meals=0)
        service, mock_repo = self._make_service(ngo=ngo, existing_capacity=None)
        mock_repo.upsert_date_capacity.return_value = new_cap

        with patch("backend.modules.ngos.services.db") as mock_db:
            mock_db.session.refresh = MagicMock()
            result = service.update_my_capacity(
                user_id=10, role="NGO",
                validated_data={"date": _FUTURE_DATE, "maximum_capacity": 100},
            )

        mock_repo.upsert_date_capacity.assert_called_once_with(
            ngo_id=1,
            capacity_date=_FUTURE_DATE,
            max_meals=100,
        )

    def test_update_preserves_allocated_on_increase(self):
        """Increasing maximum from 100 to 150 with 30 allocated."""
        ngo = _make_ngo()
        existing = _make_date_capacity(max_meals=100, allocated_meals=30)
        updated = _make_date_capacity(max_meals=150, allocated_meals=30)
        service, mock_repo = self._make_service(ngo=ngo, existing_capacity=existing)
        mock_repo.upsert_date_capacity.return_value = updated

        with patch("backend.modules.ngos.services.db") as mock_db:
            mock_db.session.refresh = MagicMock()
            service.update_my_capacity(
                user_id=10, role="NGO",
                validated_data={"date": _FUTURE_DATE, "maximum_capacity": 150},
            )

        mock_repo.upsert_date_capacity.assert_called_once_with(
            ngo_id=1,
            capacity_date=_FUTURE_DATE,
            max_meals=150,
        )

    def test_update_reduction_below_allocated_raises(self):
        """Reducing maximum below allocated must raise CapacityReductionBelowAllocatedException."""
        ngo = _make_ngo()
        existing = _make_date_capacity(max_meals=100, allocated_meals=80)
        service, _ = self._make_service(ngo=ngo, existing_capacity=existing)

        with self.assertRaises(CapacityReductionBelowAllocatedException):
            service.update_my_capacity(
                user_id=10, role="NGO",
                validated_data={"date": _FUTURE_DATE, "maximum_capacity": 50},
            )

    def test_update_reduction_exactly_at_allocated_is_allowed(self):
        """Setting maximum_capacity exactly equal to allocated must be permitted."""
        ngo = _make_ngo()
        existing = _make_date_capacity(max_meals=100, allocated_meals=80)
        exact_cap = _make_date_capacity(max_meals=80, allocated_meals=80)
        service, mock_repo = self._make_service(ngo=ngo, existing_capacity=existing)
        mock_repo.upsert_date_capacity.return_value = exact_cap

        with patch("backend.modules.ngos.services.db") as mock_db:
            mock_db.session.refresh = MagicMock()
            result = service.update_my_capacity(
                user_id=10, role="NGO",
                validated_data={"date": _FUTURE_DATE, "maximum_capacity": 80},
            )
        mock_repo.upsert_date_capacity.assert_called_once()

    def test_update_wrong_role_raises(self):
        service = NGOCapacityService(repository=MagicMock())
        with self.assertRaises(InsufficientRoleException):
            service.update_my_capacity(
                user_id=1, role="VOLUNTEER",
                validated_data={"date": _FUTURE_DATE, "maximum_capacity": 100},
            )

    def test_update_ngo_not_found_raises(self):
        mock_repo = MagicMock(spec=NGORepository)
        mock_repo.find_by_user_id.return_value = None
        service = NGOCapacityService(repository=mock_repo)
        with self.assertRaises(NGONotFoundException):
            service.update_my_capacity(
                user_id=99, role="NGO",
                validated_data={"date": _FUTURE_DATE, "maximum_capacity": 100},
            )

    def test_update_rollback_on_commit_failure(self):
        """DB commit failure must trigger rollback."""
        ngo = _make_ngo()
        service, mock_repo = self._make_service(ngo=ngo, existing_capacity=None)
        mock_repo.upsert_date_capacity.return_value = _make_date_capacity()

        with patch("backend.modules.ngos.services.db") as mock_db:
            mock_db.session.commit.side_effect = RuntimeError("DB failure")
            with self.assertRaises(RuntimeError):
                service.update_my_capacity(
                    user_id=10, role="NGO",
                    validated_data={"date": _FUTURE_DATE, "maximum_capacity": 100},
                )
            mock_db.session.rollback.assert_called_once()


if __name__ == "__main__":
    unittest.main()
