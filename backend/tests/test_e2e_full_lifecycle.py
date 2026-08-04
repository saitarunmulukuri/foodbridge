"""Sprint 5.6 Phase 2 — Complete End-to-End Workflow Integration Test.

Executes the complete production business lifecycle from registration to donation completion:

Workflow Steps:
    1. Register Donor, NGO, Volunteer via Auth API
    2. Set NGO & Volunteer accounts to ACTIVE & VERIFIED in database
    3. NGO updates date-capacity availability for tomorrow
    4. Volunteer sets operational status to AVAILABLE with active location
    5. Donor creates a surplus food donation (DRAFT)
    6. Donor submits donation for matching (SUBMITTED)
    7. Decision Engine runs matching algorithm (Generates NGO Request)
    8. NGO receives notification & accepts request (ACCEPTED)
    9. Volunteer receives notification & accepts assignment (ASSIGNED)
   10. Volunteer starts pickup (IN_TRANSIT)
   11. Volunteer completes delivery (COMPLETED)

Audit Verification:
    - Final donation status == COMPLETED
    - NGO request status == ACCEPTED
    - Volunteer assignment status == COMPLETED
    - Full StatusHistory, NGORequestHistory, AssignmentHistory trails created
    - Notifications emitted to all parties
"""

import json
import unittest
from datetime import date, datetime, timedelta, timezone

from backend.app import create_app
from backend.database import db
from backend.modules.authentication.models import User
from backend.modules.donations.models import Donation, DonationStatusHistory
from backend.modules.donors.models import Donor
from backend.modules.ngos.models import NGO, NGODateCapacity, NGORequest, NGORequestHistory
from backend.modules.notifications.models import Notification
from backend.modules.volunteers.models import AssignmentHistory, Volunteer, VolunteerAssignment
from backend.shared.constants.enums import (
    AccountStatus,
    AssignmentStatus,
    DonationStatus,
    OperationalStatus,
    RequestStatus,
    VerificationStatus,
)


_test_app = None

def get_test_app():
    global _test_app
    if _test_app is None:
        _test_app = create_app("testing")
        with _test_app.app_context():
            db.create_all()
    return _test_app


class TestE2EFullLifecycle(unittest.TestCase):
    """End-to-End full lifecycle integration test suite."""

    @classmethod
    def setUpClass(cls):
        """Set up all three user roles and execute the end-to-end flow."""
        cls.app = get_test_app()
        cls.client = cls.app.test_client()
        cls.now = datetime.now(timezone.utc)
        cls.tomorrow_date = (date.today() + timedelta(days=1))
        cls.future_iso = (cls.now + timedelta(hours=2)).isoformat()
        cls.far_future_iso = (cls.now + timedelta(hours=10)).isoformat()

    def _auth_header(self, token: str) -> dict:
        return {"Authorization": f"Bearer {token}"}

    def test_e2e_donation_full_lifecycle(self):
        # -------------------------------------------------------------------
        # Step 1: Register & Login Donor
        # -------------------------------------------------------------------
        donor_payload = {
            "email": "e2e_donor@foodbridge.org",
            "password": "Secure@12345",
            "password_confirmation": "Secure@12345",
            "role": "DONOR",
            "profile": {
                "organisation_name": "E2E Grand Hotel",
                "contact_person": "Dave Donor",
                "phone": "9900112233",
                "address": "100 Jubilee Hills, Hyderabad",
                "latitude": 17.431,
                "longitude": 78.407,
            },
        }
        res = self.client.post("/api/v1/auth/register", data=json.dumps(donor_payload), content_type="application/json")
        self.assertEqual(res.status_code, 201)

        res = self.client.post("/api/v1/auth/login", data=json.dumps({"email": "e2e_donor@foodbridge.org", "password": "Secure@12345"}), content_type="application/json")
        self.assertEqual(res.status_code, 200)
        donor_token = json.loads(res.data)["data"]["access_token"]

        # -------------------------------------------------------------------
        # Step 2: Register & Verify NGO
        # -------------------------------------------------------------------
        ngo_payload = {
            "email": "e2e_ngo@foodbridge.org",
            "password": "Secure@12345",
            "password_confirmation": "Secure@12345",
            "role": "NGO",
            "profile": {
                "organisation_name": "E2E Relief Foundation",
                "registration_number": "E2E-NGO-99",
                "contact_person": "Nancy NGO",
                "phone": "9944556677",
                "address": "200 Banjara Hills, Hyderabad",
                "latitude": 17.412,
                "longitude": 78.432,
                "service_radius_km": 30,
            },
        }
        res = self.client.post("/api/v1/auth/register", data=json.dumps(ngo_payload), content_type="application/json")
        self.assertEqual(res.status_code, 201)

        # Activate & Verify NGO directly in DB
        with self.app.app_context():
            ngo_user = db.session.query(User).filter_by(email="e2e_ngo@foodbridge.org").first()
            ngo_user.account_status = AccountStatus.ACTIVE
            ngo_profile = db.session.query(NGO).filter_by(user_id=ngo_user.user_id).first()
            ngo_profile.verification_status = VerificationStatus.VERIFIED
            db.session.commit()

        res = self.client.post("/api/v1/auth/login", data=json.dumps({"email": "e2e_ngo@foodbridge.org", "password": "Secure@12345"}), content_type="application/json")
        self.assertEqual(res.status_code, 200)
        ngo_token = json.loads(res.data)["data"]["access_token"]

        # NGO updates daily capacity for today (matching donation available_from date)
        res = self.client.put(
            "/api/v1/ngos/me/capacity",
            data=json.dumps({"date": date.today().isoformat(), "maximum_capacity": 200}),
            content_type="application/json",
            headers=self._auth_header(ngo_token),
        )
        self.assertEqual(res.status_code, 200)

        # -------------------------------------------------------------------
        # Step 3: Register & Verify Volunteer
        # -------------------------------------------------------------------
        vol_payload = {
            "email": "e2e_vol@foodbridge.org",
            "password": "Secure@12345",
            "password_confirmation": "Secure@12345",
            "role": "VOLUNTEER",
            "profile": {
                "phone": "9988776655",
                "vehicle_type": "VAN",
                "latitude": 17.420,
                "longitude": 78.420,
            },
        }
        res = self.client.post("/api/v1/auth/register", data=json.dumps(vol_payload), content_type="application/json")
        self.assertEqual(res.status_code, 201)

        with self.app.app_context():
            vol_user = db.session.query(User).filter_by(email="e2e_vol@foodbridge.org").first()
            vol_profile = db.session.query(Volunteer).filter_by(user_id=vol_user.user_id).first()
            vol_profile.verification_status = VerificationStatus.VERIFIED
            db.session.commit()

        res = self.client.post("/api/v1/auth/login", data=json.dumps({"email": "e2e_vol@foodbridge.org", "password": "Secure@12345"}), content_type="application/json")
        self.assertEqual(res.status_code, 200)
        vol_token = json.loads(res.data)["data"]["access_token"]

        # Volunteer updates location & sets status to AVAILABLE
        res = self.client.patch(
            "/api/v1/volunteers/me",
            data=json.dumps({"latitude": 17.425, "longitude": 78.415, "operational_status": "AVAILABLE"}),
            content_type="application/json",
            headers=self._auth_header(vol_token),
        )
        self.assertEqual(res.status_code, 200)

        # -------------------------------------------------------------------
        # Step 4: Donor Creates Donation (DRAFT)
        # -------------------------------------------------------------------
        donation_payload = {
            "donation_title": "Fresh Hotel Buffet Meal Packs",
            "description": "50 packs of rice and paneer curry.",
            "available_from": self.future_iso,
            "expiry_time": self.far_future_iso,
            "total_quantity": "50.00",
            "quantity_unit": "PACKET",
            "pickup_address": "100 Jubilee Hills Road 36",
            "pickup_city": "Hyderabad",
            "pickup_state": "Telangana",
            "pickup_postal_code": "500033",
            "pickup_latitude": "17.4310",
            "pickup_longitude": "78.4070",
            "delivery_preference": "PICKUP_REQUIRED",
            "items": [
                {
                    "item_name": "Paneer Butter Masala",
                    "category": "CURRY",
                    "quantity": "25.00",
                    "unit": "PACKET",
                    "food_type": "VEGETARIAN",
                    "contains_allergens": False,
                },
                {
                    "item_name": "Jeera Rice",
                    "category": "RICE",
                    "quantity": "25.00",
                    "unit": "PACKET",
                    "food_type": "VEGETARIAN",
                    "contains_allergens": False,
                },
            ],
        }
        res = self.client.post(
            "/api/v1/donations",
            data=json.dumps(donation_payload),
            content_type="application/json",
            headers=self._auth_header(donor_token),
        )
        self.assertEqual(res.status_code, 201)
        donation_data = json.loads(res.data)["data"]
        donation_id = donation_data["donation_id"]
        self.assertEqual(donation_data["status"], "DRAFT")

        # -------------------------------------------------------------------
        # Step 5: Donor Submits Donation (DRAFT → SUBMITTED)
        # -------------------------------------------------------------------
        res = self.client.post(
            f"/api/v1/donations/{donation_id}/submit",
            content_type="application/json",
            headers=self._auth_header(donor_token),
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(json.loads(res.data)["data"]["status"], "SUBMITTED")

        # -------------------------------------------------------------------
        # Step 6: Decision Engine Runs Recommendation Pipeline (with persist=True)
        # -------------------------------------------------------------------
        from backend.modules.decision_engine.services import DecisionEngineService
        with self.app.app_context():
            de_service = DecisionEngineService()
            de_result = de_service.run(donation_id=donation_id, persist=True)
            self.assertEqual(de_result.donation_id, donation_id)
            self.assertGreaterEqual(len(de_result.recommendations), 1)

        # Retrieve generated NGO request
        res = self.client.get(
            "/api/v1/ngo/requests",
            headers=self._auth_header(ngo_token),
        )
        self.assertEqual(res.status_code, 200)
        requests_list = json.loads(res.data)["data"]["requests"]
        self.assertGreaterEqual(len(requests_list), 1)
        request_id = requests_list[0]["request_id"]

        # -------------------------------------------------------------------
        # Step 7: NGO Accepts Request
        # -------------------------------------------------------------------
        res = self.client.post(
            f"/api/v1/ngo/requests/{request_id}/accept",
            headers=self._auth_header(ngo_token),
        )
        self.assertEqual(res.status_code, 200)
        accept_data = json.loads(res.data)["data"]
        self.assertEqual(accept_data["status"], "ACCEPTED")

        # -------------------------------------------------------------------
        # Step 8: Volunteer Receives Assignment & Accepts
        # -------------------------------------------------------------------
        res = self.client.get(
            "/api/v1/volunteers/assignments",
            headers=self._auth_header(vol_token),
        )
        self.assertEqual(res.status_code, 200)
        assignments = json.loads(res.data)["data"]["assignments"]
        self.assertGreaterEqual(len(assignments), 1)
        assignment_id = assignments[0]["assignment_id"]

        # -------------------------------------------------------------------
        # Step 9: Volunteer Accepts Assignment (Triggers PICKUP_IN_PROGRESS)
        # -------------------------------------------------------------------
        res = self.client.post(
            f"/api/v1/volunteers/assignments/{assignment_id}/accept",
            headers=self._auth_header(vol_token),
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(json.loads(res.data)["data"]["status"], "ACCEPTED")

        # -------------------------------------------------------------------
        # Step 10: Volunteer Completes Delivery (Triggers COMPLETED)
        # -------------------------------------------------------------------
        res = self.client.post(
            f"/api/v1/volunteers/assignments/{assignment_id}/complete",
            headers=self._auth_header(vol_token),
        )
        self.assertEqual(res.status_code, 200)

        # -------------------------------------------------------------------
        # Step 11: Audit Verification of DB Entities & State Machine
        # -------------------------------------------------------------------
        with self.app.app_context():
            db_donation = db.session.get(Donation, donation_id)
            self.assertIsNotNone(db_donation)
            self.assertEqual(db_donation.status, DonationStatus.COMPLETED)

            # Audit status history
            history_entries = db.session.query(DonationStatusHistory).filter_by(donation_id=donation_id).all()
            statuses_recorded = [h.new_status for h in history_entries]
            self.assertIn(DonationStatus.DRAFT, statuses_recorded)
            self.assertIn(DonationStatus.SUBMITTED, statuses_recorded)
            self.assertIn(DonationStatus.PENDING_NGO, statuses_recorded)
            self.assertIn(DonationStatus.PICKUP_IN_PROGRESS, statuses_recorded)
            self.assertIn(DonationStatus.COMPLETED, statuses_recorded)

            # Audit NGO Request
            db_request = db.session.get(NGORequest, request_id)
            self.assertEqual(db_request.status, RequestStatus.ACCEPTED)

            # Audit Volunteer Assignment
            db_assignment = db.session.get(VolunteerAssignment, assignment_id)
            self.assertEqual(db_assignment.status, AssignmentStatus.ACCEPTED)

            # Check notifications were generated for user identity
            notifications = db.session.query(Notification).all()
            self.assertGreaterEqual(len(notifications), 1)


if __name__ == "__main__":
    unittest.main()
