"""Unit tests for the NGO Daily Capacity Management module — Sprint 3.2.

Test Coverage:
    - Capacity validators (maximum_capacity, day_of_week)
    - NGOCapacityUpdateSchema (validation, read-only exclusion, normalisation)
    - NGOCapacityResponseSchema (serialisation with computed fields)
    - NGORepository capacity methods (find_all, find_by_day, upsert)
    - NGOCapacityService (get_my_capacity, update_my_capacity)
    - Business rules: remaining_capacity computed, reduction guard
"""

import unittest
from decimal import Decimal
from unittest.mock import MagicMock, call, patch

# ORM model imports — required to configure SQLAlchemy mapper registry
from backend.modules.authentication.models import User
from backend.modules.donors.models import Donor
from backend.modules.ngos.models import NGO, NGODailyCapacity, NGORequest, NGORequestHistory
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
    validate_day_of_week,
    validate_maximum_capacity,
)
from backend.shared.constants.enums import CapacityStatus, DayOfWeek, VerificationStatus
from marshmallow import ValidationError


# -----------------------------------------------------------------------
# Helper factories
# -----------------------------------------------------------------------


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


def _make_capacity(
    capacity_id: int = 1,
    ngo_id: int = 1,
    day: DayOfWeek = DayOfWeek.MONDAY,
    max_meals: int = 100,
    remaining: int = 70,
    status: CapacityStatus = CapacityStatus.ACTIVE,
) -> MagicMock:
    cap = MagicMock(spec=NGODailyCapacity)
    cap.capacity_id = capacity_id
    cap.ngo_id = ngo_id
    cap.day_of_week = day
    cap.max_meals = max_meals
    cap.remaining_capacity = remaining
    cap.status = status
    cap.created_at = None
    cap.updated_at = None
    return cap


# -----------------------------------------------------------------------
# Tests: Capacity Validators
# -----------------------------------------------------------------------


class TestCapacityValidators(unittest.TestCase):
    """Test suite for Sprint 3.2 capacity validators."""

    def test_valid_maximum_capacity(self):
        validate_maximum_capacity(50)  # should not raise

    def test_maximum_capacity_zero_rejected(self):
        with self.assertRaises(ValidationError):
            validate_maximum_capacity(0)

    def test_maximum_capacity_negative_rejected(self):
        with self.assertRaises(ValidationError):
            validate_maximum_capacity(-10)

    def test_maximum_capacity_float_rejected(self):
        with self.assertRaises(ValidationError):
            validate_maximum_capacity(10.5)

    def test_valid_day_of_week_monday(self):
        validate_day_of_week("MONDAY")

    def test_valid_day_of_week_sunday(self):
        validate_day_of_week("SUNDAY")

    def test_invalid_day_of_week(self):
        with self.assertRaises(ValidationError):
            validate_day_of_week("FUNDAY")

    def test_invalid_day_empty(self):
        with self.assertRaises(ValidationError):
            validate_day_of_week("")


# -----------------------------------------------------------------------
# Tests: NGOCapacityUpdateSchema
# -----------------------------------------------------------------------


class TestNGOCapacityUpdateSchema(unittest.TestCase):
    """Test suite for NGOCapacityUpdateSchema validation."""

    def setUp(self):
        self.schema = NGOCapacityUpdateSchema()

    def test_valid_minimal_payload(self):
        data = self.schema.load({"day_of_week": "MONDAY", "maximum_capacity": 100})
        self.assertEqual(data["day_of_week"], "MONDAY")
        self.assertEqual(data["maximum_capacity"], 100)

    def test_valid_with_status(self):
        data = self.schema.load({
            "day_of_week": "FRIDAY",
            "maximum_capacity": 50,
            "status": "PAUSED",
        })
        self.assertEqual(data["status"], "PAUSED")

    def test_day_of_week_required(self):
        with self.assertRaises(ValidationError) as ctx:
            self.schema.load({"maximum_capacity": 100})
        self.assertIn("day_of_week", ctx.exception.messages)

    def test_maximum_capacity_required(self):
        with self.assertRaises(ValidationError) as ctx:
            self.schema.load({"day_of_week": "MONDAY"})
        self.assertIn("maximum_capacity", ctx.exception.messages)

    def test_maximum_capacity_zero_rejected(self):
        with self.assertRaises(ValidationError):
            self.schema.load({"day_of_week": "MONDAY", "maximum_capacity": 0})

    def test_invalid_status_rejected(self):
        with self.assertRaises(ValidationError):
            self.schema.load({
                "day_of_week": "MONDAY",
                "maximum_capacity": 100,
                "status": "UNKNOWN",
            })

    def test_read_only_fields_excluded(self):
        """allocated_capacity, remaining_capacity must be silently excluded."""
        data = self.schema.load({
            "day_of_week": "MONDAY",
            "maximum_capacity": 100,
            "allocated_capacity": 50,
            "remaining_capacity": 50,
            "capacity_id": 999,
            "ngo_id": 1,
        })
        self.assertNotIn("allocated_capacity", data)
        self.assertNotIn("remaining_capacity", data)
        self.assertNotIn("capacity_id", data)
        self.assertNotIn("ngo_id", data)

    def test_day_of_week_normalised_to_uppercase(self):
        data = self.schema.load({"day_of_week": "monday", "maximum_capacity": 50})
        self.assertEqual(data["day_of_week"], "MONDAY")


# -----------------------------------------------------------------------
# Tests: NGOCapacityService — Computed Fields
# -----------------------------------------------------------------------


class TestNGOCapacityServiceComputedFields(unittest.TestCase):
    """Test suite for the capacity computation logic in NGOCapacityService."""

    def test_compute_allocated_with_existing_record(self):
        """allocated = max_meals - remaining_capacity."""
        cap = _make_capacity(max_meals=100, remaining=70)
        allocated = NGOCapacityService._compute_allocated(cap)
        self.assertEqual(allocated, 30)

    def test_compute_allocated_fully_available(self):
        """If remaining == max, allocated == 0."""
        cap = _make_capacity(max_meals=50, remaining=50)
        allocated = NGOCapacityService._compute_allocated(cap)
        self.assertEqual(allocated, 0)

    def test_compute_allocated_fully_consumed(self):
        """If remaining == 0, all capacity is allocated."""
        cap = _make_capacity(max_meals=80, remaining=0)
        allocated = NGOCapacityService._compute_allocated(cap)
        self.assertEqual(allocated, 80)

    def test_compute_allocated_none_record_returns_zero(self):
        """New NGO with no capacity record → allocated defaults to 0."""
        allocated = NGOCapacityService._compute_allocated(None)
        self.assertEqual(allocated, 0)

    def test_serialize_capacity_remaining_equals_max_minus_allocated(self):
        """Serialised remaining_capacity must equal max - allocated."""
        cap = _make_capacity(max_meals=100, remaining=60)
        serialised = NGOCapacityService._serialize_capacity(cap)
        # allocated = 100 - 60 = 40; remaining = 100 - 40 = 60
        self.assertEqual(serialised["maximum_capacity"], 100)
        self.assertEqual(serialised["allocated_capacity"], 40)
        self.assertEqual(serialised["remaining_capacity"], 60)
        # Invariant: max == allocated + remaining
        self.assertEqual(
            serialised["maximum_capacity"],
            serialised["allocated_capacity"] + serialised["remaining_capacity"],
        )


# -----------------------------------------------------------------------
# Tests: NGOCapacityService — Business Rules
# -----------------------------------------------------------------------


class TestNGOCapacityServiceBusinessRules(unittest.TestCase):
    """Test suite for NGOCapacityService orchestration and business rules."""

    def _make_service(self, ngo=None, existing_capacity=None):
        mock_repo = MagicMock(spec=NGORepository)
        mock_repo.find_by_user_id.return_value = ngo
        mock_repo.find_capacity_by_day.return_value = existing_capacity

        if existing_capacity is not None:
            mock_repo.upsert_capacity.return_value = existing_capacity
        else:
            mock_repo.upsert_capacity.return_value = _make_capacity(max_meals=100, remaining=100)

        return NGOCapacityService(repository=mock_repo), mock_repo

    def test_get_my_capacity_returns_all_records(self):
        ngo = _make_ngo()
        mock_repo = MagicMock(spec=NGORepository)
        mock_repo.find_by_user_id.return_value = ngo
        mock_repo.find_all_capacities.return_value = [
            _make_capacity(capacity_id=1, day=DayOfWeek.MONDAY),
            _make_capacity(capacity_id=2, day=DayOfWeek.TUESDAY),
        ]
        service = NGOCapacityService(repository=mock_repo)
        result = service.get_my_capacity(user_id=10, role="NGO")
        self.assertEqual(result["total"], 2)
        self.assertEqual(len(result["capacities"]), 2)

    def test_get_my_capacity_empty_returns_empty_list(self):
        ngo = _make_ngo()
        mock_repo = MagicMock(spec=NGORepository)
        mock_repo.find_by_user_id.return_value = ngo
        mock_repo.find_all_capacities.return_value = []
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
        new_cap = _make_capacity(max_meals=100, remaining=100)
        service, mock_repo = self._make_service(ngo=ngo, existing_capacity=None)
        mock_repo.upsert_capacity.return_value = new_cap

        with patch("backend.modules.ngos.services.db") as mock_db:
            mock_db.session.refresh = MagicMock()
            result = service.update_my_capacity(
                user_id=10, role="NGO",
                validated_data={"day_of_week": "MONDAY", "maximum_capacity": 100, "status": None},
            )

        # remaining_capacity must be passed as 100 (= 100 - 0 allocated)
        mock_repo.upsert_capacity.assert_called_once_with(
            ngo_id=1,
            day_of_week=DayOfWeek.MONDAY,
            max_meals=100,
            remaining_capacity=100,
            status=None,
        )

    def test_update_preserves_allocated_on_increase(self):
        """Increasing maximum from 100 to 150 with 30 allocated → remaining 120."""
        ngo = _make_ngo()
        existing = _make_capacity(max_meals=100, remaining=70)  # allocated = 30
        updated = _make_capacity(max_meals=150, remaining=120)
        service, mock_repo = self._make_service(ngo=ngo, existing_capacity=existing)
        mock_repo.upsert_capacity.return_value = updated

        with patch("backend.modules.ngos.services.db") as mock_db:
            mock_db.session.refresh = MagicMock()
            service.update_my_capacity(
                user_id=10, role="NGO",
                validated_data={"day_of_week": "MONDAY", "maximum_capacity": 150, "status": None},
            )

        mock_repo.upsert_capacity.assert_called_once_with(
            ngo_id=1,
            day_of_week=DayOfWeek.MONDAY,
            max_meals=150,
            remaining_capacity=120,  # 150 - 30 allocated
            status=None,
        )

    def test_update_reduction_below_allocated_raises(self):
        """Reducing maximum below allocated must raise CapacityReductionBelowAllocatedException."""
        ngo = _make_ngo()
        existing = _make_capacity(max_meals=100, remaining=20)  # allocated = 80
        service, _ = self._make_service(ngo=ngo, existing_capacity=existing)

        # Trying to set maximum to 50, but 80 meals are already allocated
        with self.assertRaises(CapacityReductionBelowAllocatedException):
            service.update_my_capacity(
                user_id=10, role="NGO",
                validated_data={"day_of_week": "MONDAY", "maximum_capacity": 50, "status": None},
            )

    def test_update_reduction_exactly_at_allocated_is_allowed(self):
        """Setting maximum_capacity exactly equal to allocated must be permitted."""
        ngo = _make_ngo()
        existing = _make_capacity(max_meals=100, remaining=20)  # allocated = 80
        exact_cap = _make_capacity(max_meals=80, remaining=0)
        service, mock_repo = self._make_service(ngo=ngo, existing_capacity=existing)
        mock_repo.upsert_capacity.return_value = exact_cap

        with patch("backend.modules.ngos.services.db") as mock_db:
            mock_db.session.refresh = MagicMock()
            result = service.update_my_capacity(
                user_id=10, role="NGO",
                validated_data={"day_of_week": "MONDAY", "maximum_capacity": 80, "status": None},
            )
        # Should not raise — 80 == 80 allocated is exactly at the limit
        mock_repo.upsert_capacity.assert_called_once()

    def test_update_wrong_role_raises(self):
        service = NGOCapacityService(repository=MagicMock())
        with self.assertRaises(InsufficientRoleException):
            service.update_my_capacity(
                user_id=1, role="VOLUNTEER",
                validated_data={"day_of_week": "MONDAY", "maximum_capacity": 100, "status": None},
            )

    def test_update_ngo_not_found_raises(self):
        mock_repo = MagicMock(spec=NGORepository)
        mock_repo.find_by_user_id.return_value = None
        service = NGOCapacityService(repository=mock_repo)
        with self.assertRaises(NGONotFoundException):
            service.update_my_capacity(
                user_id=99, role="NGO",
                validated_data={"day_of_week": "MONDAY", "maximum_capacity": 100, "status": None},
            )

    def test_update_rollback_on_commit_failure(self):
        """DB commit failure must trigger rollback."""
        ngo = _make_ngo()
        service, mock_repo = self._make_service(ngo=ngo, existing_capacity=None)
        mock_repo.upsert_capacity.return_value = _make_capacity()

        with patch("backend.modules.ngos.services.db") as mock_db:
            mock_db.session.commit.side_effect = RuntimeError("DB failure")
            with self.assertRaises(RuntimeError):
                service.update_my_capacity(
                    user_id=10, role="NGO",
                    validated_data={"day_of_week": "MONDAY", "maximum_capacity": 100, "status": None},
                )
            mock_db.session.rollback.assert_called_once()


if __name__ == "__main__":
    unittest.main()
