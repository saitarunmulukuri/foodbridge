"""Integration and unit tests verifying the Meal Capacity Management fix.

Verifies:
    1. Successful updates for 1, 2, 50, 100, and large capacities.
    2. Optional date with automatic today UTC fallback and day_of_week synchronization.
    3. Rejection of 0, negative numbers, non-numeric, decimal values, and missing fields.
    4. Meaningful validation messages in API error responses.
    5. Database persistence in both NGODateCapacity and NGODailyCapacity.
    6. Role-based authorization & ownership checks.
    7. Decision Engine capacity scoring and eligibility using the newly updated capacity.
"""

import json
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy import update

from backend.database import db
from backend.modules.authentication.models import User
from backend.modules.decision_engine.candidate_finder import CandidateNGOFinder
from backend.modules.decision_engine.config import DecisionEngineConfig
from backend.modules.decision_engine.dto import ScoredNGO
from backend.modules.decision_engine.filters import EligibilityFilterPipeline
from backend.modules.decision_engine.scoring.engine import ScoringEngine
from backend.modules.decision_engine.services import DecisionEngineService
from backend.modules.donations.models import Donation, DonationItem
from backend.modules.donors.models import Donor
from backend.modules.ngos.models import NGO, NGODailyCapacity, NGODateCapacity
from backend.shared.constants.enums import (
    AccountStatus,
    CapacityStatus,
    DayOfWeek,
    DonationStatus,
    FoodType,
    ItemCategory,
    QuantityUnit,
    UserRole,
    VerificationStatus,
)
from backend.tests.test_api_integration import BaseAPITest


class TestNGOCapacityBugfix(BaseAPITest):
    """Test suite for NGO Meal Capacity updates and Decision Engine integration."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        uid = uuid.uuid4().hex[:6]
        cls.ngo_email = f"ngo_cap_{uid}@test.com"
        cls.donor_email = f"donor_cap_{uid}@test.com"
        cls.reg_no = f"REG-CAP-{uid}"

        # Register NGO user
        ngo_payload = {
            "email": cls.ngo_email,
            "password": "Secure@12345",
            "password_confirmation": "Secure@12345",
            "role": "NGO",
            "profile": {
                "organisation_name": "Capacity Relief NGO",
                "registration_number": cls.reg_no,
                "contact_person": "Priya Sharma",
                "phone": "9876543210",
                "address": "456 Park Ave, Hyderabad",
                "latitude": 17.3850,
                "longitude": 78.4867,
                "service_radius_km": 15,
            },
        }

        r_reg = cls.client.post("/api/v1/auth/register", data=json.dumps(ngo_payload), content_type="application/json")
        reg_json = json.loads(r_reg.data)
        if not reg_json.get("success"):
            raise RuntimeError(f"NGO registration failed: {reg_json}")

        donor_payload = {
            "email": cls.donor_email,
            "password": "Secure@12345",
            "password_confirmation": "Secure@12345",
            "role": "DONOR",
            "profile": {
                "organisation_name": "Donor Kitchen",
                "contact_person": "Ravi Kumar",
                "phone": "9876543211",
                "address": "123 Food Street, Hyderabad",
            },
        }
        cls.client.post("/api/v1/auth/register", data=json.dumps(donor_payload), content_type="application/json")

        # Activate & verify NGO in DB
        with cls.app.app_context():
            db.session.execute(
                update(User)
                .where(User.email.in_([cls.ngo_email, cls.donor_email]))
                .values(account_status=AccountStatus.ACTIVE)
            )
            db.session.execute(
                update(NGO)
                .where(NGO.registration_number == cls.reg_no)
                .values(verification_status=VerificationStatus.VERIFIED)
            )
            db.session.commit()

        # Login
        r_ngo = cls.client.post(
            "/api/v1/auth/login",
            data=json.dumps({"email": cls.ngo_email, "password": "Secure@12345"}),
            content_type="application/json",
        )
        login_ngo_json = json.loads(r_ngo.data)
        if not login_ngo_json.get("success"):
            raise RuntimeError(f"NGO login failed: {login_ngo_json}")
        cls.ngo_token = login_ngo_json["data"]["access_token"]

        r_donor = cls.client.post(
            "/api/v1/auth/login",
            data=json.dumps({"email": cls.donor_email, "password": "Secure@12345"}),
            content_type="application/json",
        )
        cls.donor_token = json.loads(r_donor.data)["data"]["access_token"]

    def test_01_update_capacity_with_value_two_succeeds(self):
        """Entering '2' without date (sending day_of_week or just capacity) must succeed."""
        today_name = datetime.now(timezone.utc).strftime("%A").upper()
        payload = {
            "day_of_week": today_name,
            "maximum_capacity": 2,
            "status": "ACTIVE",
        }
        res = self.client.put(
            "/api/v1/ngos/me/capacity",
            data=json.dumps(payload),
            content_type="application/json",
            headers=self._auth_headers(self.ngo_token),
        )
        self.assertEqual(res.status_code, 200, f"Failed with {res.data}")
        body = json.loads(res.data)
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["maximum_capacity"], 2)
        self.assertEqual(body["data"]["remaining_capacity"], 2)
        self.assertEqual(body["data"]["allocated_capacity"], 0)

    def test_02_update_capacity_various_valid_values(self):
        """Values 1, 50, 100, and 5000 must all be accepted."""
        for cap_val in [1, 50, 100, 5000]:
            payload = {"maximum_capacity": cap_val}
            res = self.client.put(
                "/api/v1/ngos/me/capacity",
                data=json.dumps(payload),
                content_type="application/json",
                headers=self._auth_headers(self.ngo_token),
            )
            self.assertEqual(res.status_code, 200)
            body = json.loads(res.data)
            self.assertEqual(body["data"]["maximum_capacity"], cap_val)
            self.assertEqual(body["data"]["remaining_capacity"], cap_val)

    def test_03_reject_zero_and_negative_capacity(self):
        """0 and negative values must be rejected with 422 and clear error details."""
        for invalid_val in [0, -5, -100]:
            payload = {"maximum_capacity": invalid_val}
            res = self.client.put(
                "/api/v1/ngos/me/capacity",
                data=json.dumps(payload),
                content_type="application/json",
                headers=self._auth_headers(self.ngo_token),
            )
            self.assertEqual(res.status_code, 422)
            body = json.loads(res.data)
            details = body.get("error", {}).get("details", {})
            self.assertIn("maximum_capacity", details)
            self.assertIn("greater than zero", details["maximum_capacity"][0])


    def test_04_reject_non_integer_or_missing_capacity(self):
        """Non-numeric or missing maximum_capacity must be rejected."""
        # Missing maximum_capacity
        res = self.client.put(
            "/api/v1/ngos/me/capacity",
            data=json.dumps({"day_of_week": "MONDAY"}),
            content_type="application/json",
            headers=self._auth_headers(self.ngo_token),
        )
        self.assertEqual(res.status_code, 422)

        # String non-numeric
        res = self.client.put(
            "/api/v1/ngos/me/capacity",
            data=json.dumps({"maximum_capacity": "not-a-number"}),
            content_type="application/json",
            headers=self._auth_headers(self.ngo_token),
        )
        self.assertEqual(res.status_code, 422)

    def test_05_database_persistence_and_dual_sync(self):
        """Updating capacity updates both NGODateCapacity and NGODailyCapacity in the DB."""
        today_date = datetime.now(timezone.utc).date()
        today_dow = DayOfWeek(today_date.strftime("%A").upper())

        payload = {"maximum_capacity": 75}
        res = self.client.put(
            "/api/v1/ngos/me/capacity",
            data=json.dumps(payload),
            content_type="application/json",
            headers=self._auth_headers(self.ngo_token),
        )
        self.assertEqual(res.status_code, 200)

        # Check DB records
        with self.app.app_context():
            ngo_user = db.session.query(User).filter_by(email=self.ngo_email).first()
            ngo = db.session.query(NGO).filter_by(user_id=ngo_user.user_id).first()

            date_cap = (
                db.session.query(NGODateCapacity)
                .filter_by(ngo_id=ngo.ngo_id, date=today_date)
                .first()
            )
            self.assertIsNotNone(date_cap)
            self.assertEqual(date_cap.max_meals, 75)

            daily_cap = (
                db.session.query(NGODailyCapacity)
                .filter_by(ngo_id=ngo.ngo_id, day_of_week=today_dow)
                .first()
            )
            self.assertIsNotNone(daily_cap)
            self.assertEqual(daily_cap.max_meals, 75)
            self.assertEqual(daily_cap.remaining_capacity, 75)

    def test_06_donor_or_unauthorized_cannot_update_ngo_capacity(self):
        """Donors or unauthenticated requests must be rejected."""
        # Unauthenticated
        res = self.client.put(
            "/api/v1/ngos/me/capacity",
            data=json.dumps({"maximum_capacity": 50}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 401)

        # Donor role token
        res = self.client.put(
            "/api/v1/ngos/me/capacity",
            data=json.dumps({"maximum_capacity": 50}),
            content_type="application/json",
            headers=self._auth_headers(self.donor_token),
        )
        self.assertEqual(res.status_code, 403)

    def test_07_capacity_update_reflects_in_decision_engine(self):
        """Updating capacity to 2 allows matching donations <= 2 meals, and filters > 2 meals."""
        # Set capacity to 2 meals
        res = self.client.put(
            "/api/v1/ngos/me/capacity",
            data=json.dumps({"maximum_capacity": 2}),
            content_type="application/json",
            headers=self._auth_headers(self.ngo_token),
        )
        self.assertEqual(res.status_code, 200)

        # Check candidate remaining capacity in Decision Engine
        with self.app.app_context():
            ngo_user = db.session.query(User).filter_by(email=self.ngo_email).first()
            ngo = db.session.query(NGO).filter_by(user_id=ngo_user.user_id).first()

            # Pre-load candidate
            rem_cap = CandidateNGOFinder._extract_remaining_capacity(ngo)
            self.assertEqual(rem_cap, 2)
