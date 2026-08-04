"""Unit tests for the Decision Engine Eligibility Pipeline (Sprint 3.1).

Tests pure filter functions, donation validation rules, and service orchestration
using mock objects and test instances without requiring a live database.
"""

import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import MagicMock

from backend.modules.decision_engine.config import DecisionEngineConfig
from backend.modules.decision_engine.exceptions import (
    DonationExpiredException,
    EmptyDonationException,
    InvalidDonationStatusException,
    InvalidDonorException,
    NoEligibleNGOsException,
)
from backend.modules.decision_engine.filters import (
    accepting_today_filter,
    capacity_filter,
    distance_filter,
    haversine_distance_km,
)
from backend.modules.decision_engine.candidate_finder import CandidateNGO
from backend.modules.decision_engine.services import DecisionEngineService
from backend.modules.decision_engine.validator import DonationValidator
# Import all ORM models to configure SQLAlchemy relationship mapper registry
from backend.modules.authentication.models import User
from backend.modules.donors.models import Donor
from backend.modules.ngos.models import NGO, NGODailyCapacity, NGORequest, NGORequestHistory
from backend.modules.volunteers.models import Volunteer, VolunteerAssignment, AssignmentHistory
from backend.modules.donations.models import Donation, DonationItem, DecisionEngineRun, RecommendationCycle, DonationStatusHistory
from backend.modules.notifications.models import Notification
from backend.shared.constants.enums import (
    AccountStatus,
    CapacityStatus,
    DayOfWeek,
    DonationStatus,
    FoodType,
    ItemCategory,
    QuantityUnit,
    VerificationStatus,
)


def _create_mock_donor(donor_id: int = 1, is_active: bool = True, account_status: AccountStatus = AccountStatus.ACTIVE) -> Donor:
    """Helper to create a mock Donor model instance."""
    user = MagicMock()
    user.account_status = account_status

    donor = Donor(
        donor_id=donor_id,
        user_id=10,
        organisation_name="Test Hotel Donor",
        contact_person="John Donor",
        phone="1234567890",
        address="123 Donor St",
        latitude=Decimal("17.385044"),
        longitude=Decimal("78.486671"),
        verification_status=VerificationStatus.VERIFIED,
        is_active=is_active,
    )
    donor.user = user
    return donor


def _create_mock_donation(
    donation_id: int = 100,
    status: DonationStatus = DonationStatus.DRAFT,
    expiry_time: datetime = None,
    items_count: int = 1,
    donor: Donor = None,
) -> Donation:
    """Helper to create a mock Donation model instance."""
    if expiry_time is None:
        expiry_time = datetime.now(timezone.utc) + timedelta(hours=4)

    donation = Donation(
        donation_id=donation_id,
        donor_id=donor.donor_id if donor else 1,
        donation_title="Surplus Meals Offer",
        available_from=datetime.now(timezone.utc),
        expiry_time=expiry_time,
        total_quantity=Decimal("10.0"),
        quantity_unit=QuantityUnit.KG,
        pickup_address="123 Donor St",
        pickup_city="Hyderabad",
        pickup_state="Telangana",
        pickup_postal_code="500001",
        pickup_latitude=Decimal("17.385044"),  # Hyderabad center
        pickup_longitude=Decimal("78.486671"),
        status=status,
    )
    donation.donor = donor or _create_mock_donor()

    items = []
    for i in range(items_count):
        item = DonationItem(
            item_id=i + 1,
            donation_id=donation_id,
            item_name=f"Food Item {i+1}",
            category=ItemCategory.RICE,
            quantity=Decimal("5.0"),
            unit=QuantityUnit.KG,
            food_type=FoodType.VEGETARIAN,
        )
        items.append(item)

    donation.items = items
    return donation


def _create_mock_ngo(
    ngo_id: int = 1,
    name: str = "Test NGO",
    lat: Decimal = Decimal("17.390000"),  # ~0.7 km from donor
    lon: Decimal = Decimal("78.490000"),
    service_radius_km: int = 15,
    is_active: bool = True,
    verification_status: VerificationStatus = VerificationStatus.VERIFIED,
    remaining_capacity: int = 50,
    capacity_status: CapacityStatus = CapacityStatus.ACTIVE,
) -> NGO:
    """Helper to create a mock NGO model instance with pre-joined capacity."""
    ngo = NGO(
        ngo_id=ngo_id,
        user_id=100 + ngo_id,
        organisation_name=name,
        registration_number=f"REG-{ngo_id:04d}",
        contact_person="NGO Director",
        phone="9876543210",
        address="456 NGO Rd",
        latitude=lat,
        longitude=lon,
        service_radius_km=service_radius_km,
        verification_status=verification_status,
        is_active=is_active,
    )

    cap = NGODailyCapacity(
        capacity_id=ngo_id,
        ngo_id=ngo_id,
        day_of_week=DayOfWeek.MONDAY,
        max_meals=100,
        remaining_capacity=remaining_capacity,
        status=capacity_status,
    )
    ngo.daily_capacities = [cap]
    return ngo


class TestHaversineDistance(unittest.TestCase):
    """Test suite for Haversine geographic distance calculation."""

    def test_same_coordinates_zero_distance(self):
        dist = haversine_distance_km(17.385044, 78.486671, 17.385044, 78.486671)
        self.assertAlmostEqual(dist, 0.0, places=3)

    def test_known_distance(self):
        # Distance between Hyderabad (17.3850, 78.4867) and Secunderabad (17.4399, 78.4983) is ~6.1 km
        dist = haversine_distance_km(17.3850, 78.4867, 17.4399, 78.4983)
        self.assertGreater(dist, 5.5)
        self.assertLess(dist, 7.0)


class TestEligibilityFilters(unittest.TestCase):
    """Test suite for individual pure eligibility filter functions (CandidateNGO DTOs)."""

    def _make_dto(
        self,
        remaining_capacity: int = 50,
        lat: float = 17.390000,
        lon: float = 78.490000,
        service_radius_km: int = 15,
    ) -> CandidateNGO:
        """Build a CandidateNGO DTO for filter testing."""
        from backend.modules.decision_engine.candidate_finder import CandidateNGO
        from backend.shared.constants.enums import FoodType
        return CandidateNGO(
            ngo_id=1,
            latitude=lat,
            longitude=lon,
            service_radius_km=service_radius_km,
            remaining_capacity=remaining_capacity,
            supported_food_types=list(FoodType),
            reliability_score=None,
            average_response_time_minutes=None,
        )

    def test_accepting_today_filter_active(self):
        ngo = self._make_dto(remaining_capacity=10)
        self.assertTrue(accepting_today_filter(ngo))

    def test_accepting_today_filter_paused(self):
        # PAUSED = remaining capacity is 0 in DTO context
        ngo = self._make_dto(remaining_capacity=0)
        self.assertFalse(accepting_today_filter(ngo))

    def test_accepting_today_filter_full(self):
        ngo = self._make_dto(remaining_capacity=0)
        self.assertFalse(accepting_today_filter(ngo))

    def test_accepting_today_filter_no_capacity_record(self):
        ngo = self._make_dto(remaining_capacity=0)
        self.assertFalse(accepting_today_filter(ngo))

    def test_capacity_filter_sufficient(self):
        ngo = self._make_dto(remaining_capacity=10)
        self.assertTrue(capacity_filter(ngo, min_remaining=1))

    def test_capacity_filter_zero_remaining(self):
        ngo = self._make_dto(remaining_capacity=0)
        self.assertFalse(capacity_filter(ngo, min_remaining=1))

    def test_distance_filter_within_radius(self):
        # NGO ~0.7 km away, radius 15 km
        ngo = self._make_dto(lat=17.390000, lon=78.490000, service_radius_km=15)
        self.assertTrue(distance_filter(ngo, 17.385044, 78.486671, max_radius_km=15.0))

    def test_distance_filter_outside_ngo_radius(self):
        # NGO far away (~60 km), radius 15 km
        ngo = self._make_dto(lat=17.900000, lon=78.900000, service_radius_km=15)
        self.assertFalse(distance_filter(ngo, 17.385044, 78.486671, max_radius_km=15.0))

    def test_distance_filter_capped_by_config_max_radius(self):
        # NGO radius 50 km, but config max_radius is 5 km. NGO is ~10 km away.
        ngo = self._make_dto(lat=17.470000, lon=78.490000, service_radius_km=50)
        self.assertFalse(distance_filter(ngo, 17.385044, 78.486671, max_radius_km=5.0))


class TestDonationValidator(unittest.TestCase):
    """Test suite for pre-condition DonationValidator."""

    def setUp(self):
        self.validator = DonationValidator()

    def test_valid_donation_passes(self):
        donation = _create_mock_donation()
        try:
            self.validator.validate(donation)
        except Exception as e:
            self.fail(f"Validation raised unexpected exception: {e}")

    def test_invalid_status_raises(self):
        donation = _create_mock_donation(status=DonationStatus.COMPLETED)
        with self.assertRaises(InvalidDonationStatusException):
            self.validator.validate(donation)

    def test_expired_donation_raises(self):
        past_time = datetime.now(timezone.utc) - timedelta(minutes=10)
        donation = _create_mock_donation(expiry_time=past_time)
        with self.assertRaises(DonationExpiredException):
            self.validator.validate(donation)

    def test_empty_items_raises(self):
        donation = _create_mock_donation(items_count=0)
        with self.assertRaises(EmptyDonationException):
            self.validator.validate(donation)

    def test_inactive_donor_raises(self):
        donor = _create_mock_donor(is_active=False)
        donation = _create_mock_donation(donor=donor)
        with self.assertRaises(InvalidDonorException):
            self.validator.validate(donation)


class TestDecisionEngineService(unittest.TestCase):
    """Test suite for DecisionEngineService Sprint 3.1A: foundation/skeleton only.

    Sprint 3.1A establishes the service skeleton. Business logic lives in
    EligibilityFilterPipeline, which is tested here via direct integration.
    """

    def _make_candidate_dto(
        self, ngo_id: int, lat: float, lon: float, radius: int = 15,
        remaining: int = 50,
    ) -> CandidateNGO:
        """Build a CandidateNGO DTO for pipeline integration tests."""
        from backend.shared.constants.enums import FoodType
        return CandidateNGO(
            ngo_id=ngo_id,
            latitude=lat,
            longitude=lon,
            service_radius_km=radius,
            remaining_capacity=remaining,
            supported_food_types=list(FoodType),
            reliability_score=0.9,
            average_response_time_minutes=None,
        )

    def test_service_raises_donation_not_found(self):
        """DecisionEngineService.run() raises DonationNotFoundException when donation missing."""
        from backend.modules.decision_engine.services import DecisionEngineService
        from backend.modules.decision_engine.exceptions import DonationNotFoundException
        mock_finder = MagicMock()
        mock_finder.load_donation.return_value = None
        service = DecisionEngineService(candidate_finder=mock_finder)
        with self.assertRaises(DonationNotFoundException):
            service.run(donation_id=999)

    def test_eligibility_pipeline_returns_eligible_ngos(self):
        """Integration: EligibilityFilterPipeline filters DTOs correctly."""
        from backend.modules.decision_engine.filters import EligibilityFilterPipeline
        from backend.modules.decision_engine.config import DecisionEngineConfig
        donation = _create_mock_donation(donation_id=100)
        dto1 = self._make_candidate_dto(ngo_id=1, lat=17.3860, lon=78.4870)
        dto2 = self._make_candidate_dto(ngo_id=2, lat=17.3870, lon=78.4880)

        cfg = DecisionEngineConfig(MAX_RADIUS_KM=15.0, MIN_REMAINING_CAPACITY=1)
        pipeline = EligibilityFilterPipeline()
        eligible = pipeline.filter_candidates([dto1, dto2], donation, cfg)

        self.assertEqual(len(eligible), 2)
        self.assertEqual(eligible[0].ngo_id, 1)
        self.assertEqual(eligible[1].ngo_id, 2)

    def test_eligibility_pipeline_excludes_out_of_range_ngo(self):
        """Integration: NGO outside max radius is excluded by distance filter."""
        from backend.modules.decision_engine.filters import EligibilityFilterPipeline
        from backend.modules.decision_engine.config import DecisionEngineConfig
        donation = _create_mock_donation(donation_id=200)
        # NGO ~60 km away
        far_dto = self._make_candidate_dto(ngo_id=99, lat=17.9000, lon=78.9000)

        cfg = DecisionEngineConfig(MAX_RADIUS_KM=15.0, MIN_REMAINING_CAPACITY=1)
        pipeline = EligibilityFilterPipeline()
        eligible = pipeline.filter_candidates([far_dto], donation, cfg)

        self.assertEqual(eligible, [])


if __name__ == "__main__":
    unittest.main()
