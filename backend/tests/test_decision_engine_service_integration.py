"""Integration tests for DecisionEngineService orchestration (Sprint 3.2)."""

import unittest
from decimal import Decimal
from unittest.mock import MagicMock

from backend.modules.decision_engine.candidate_finder import CandidateNGOFinder, CandidateNGO
from backend.modules.decision_engine.config import DecisionEngineConfig
from backend.modules.decision_engine.exceptions import (
    DonationNotFoundException,
    NoEligibleNGOsException,
)
from backend.modules.decision_engine.services import DecisionEngineResult, DecisionEngineService
from backend.modules.donations.models import Donation, DonationItem
from backend.shared.constants.enums import (
    AccountStatus,
    DonationStatus,
    FoodType,
    ItemCategory,
    QuantityUnit,
)


class TestDecisionEngineServiceIntegration(unittest.TestCase):
    """Test suite for DecisionEngineService full pipeline execution."""

    def _create_mock_donation(self, donation_id: int = 100) -> MagicMock:
        donor = MagicMock()
        donor.is_active = True
        donor.user = MagicMock()
        donor.user.account_status = AccountStatus.ACTIVE

        donation = MagicMock(spec=Donation)
        donation.donation_id = donation_id
        donation.status = DonationStatus.SUBMITTED
        donation.expiry_time = MagicMock()
        donation.expiry_time.tzinfo = None
        # Mock expiry in the future
        from datetime import datetime, timedelta, timezone
        donation.expiry_time = datetime.now(timezone.utc) + timedelta(hours=4)
        donation.items = [MagicMock()]
        donation.donor = donor
        donation.pickup_latitude = Decimal("17.385044")
        donation.pickup_longitude = Decimal("78.486671")
        return donation

    def _create_mock_candidate(
        self, ngo_id: int = 1, lat: float = 17.386, lon: float = 78.487
    ) -> CandidateNGO:
        return CandidateNGO(
            ngo_id=ngo_id,
            latitude=lat,
            longitude=lon,
            service_radius_km=15,
            remaining_capacity=50,
            supported_food_types=[FoodType.VEGETARIAN],
            reliability_score=0.9,
            average_response_time_minutes=30.0,
        )

    def test_run_success_flow(self):
        donation = self._create_mock_donation(100)
        c1 = self._create_mock_candidate(ngo_id=1, lat=17.386, lon=78.487)
        c2 = self._create_mock_candidate(ngo_id=2, lat=17.388, lon=78.489)

        mock_finder = MagicMock(spec=CandidateNGOFinder)
        mock_finder.load_donation.return_value = donation
        mock_finder.find_candidates.return_value = [c1, c2]

        service = DecisionEngineService(candidate_finder=mock_finder)
        result = service.run(donation_id=100)

        self.assertIsInstance(result, DecisionEngineResult)
        self.assertEqual(result.donation_id, 100)
        self.assertEqual(result.total_candidates, 2)
        self.assertEqual(result.total_eligible, 2)
        self.assertEqual(result.total_scored, 2)
        self.assertEqual(len(result.recommendations), 2)
        self.assertEqual(result.recommendations[0].rank, 1)

    def test_run_donation_not_found(self):
        mock_finder = MagicMock(spec=CandidateNGOFinder)
        mock_finder.load_donation.return_value = None

        service = DecisionEngineService(candidate_finder=mock_finder)
        with self.assertRaises(DonationNotFoundException):
            service.run(donation_id=999)

    def test_run_no_candidates(self):
        donation = self._create_mock_donation(100)
        mock_finder = MagicMock(spec=CandidateNGOFinder)
        mock_finder.load_donation.return_value = donation
        mock_finder.find_candidates.return_value = []

        service = DecisionEngineService(candidate_finder=mock_finder)
        with self.assertRaises(NoEligibleNGOsException):
            service.run(donation_id=100)


if __name__ == "__main__":
    unittest.main()
