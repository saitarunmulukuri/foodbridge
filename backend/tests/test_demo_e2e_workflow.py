"""End-to-End Automated Test for the FoodBridge Demo Presentation Workflow.

Executes the complete deterministic lifecycle with the 3 real demo accounts:
    1. Food Donor:        Dave's Kitchen (e2e_donor@foodbridge.org)
    2. NGO Partner:       Community Meals NGO (e2e_ngo@foodbridge.org)
    3. Volunteer Driver:  Rapid Dispatch Driver (e2e_vol@foodbridge.org)

Workflow Steps:
    Donor Login → Create 50 Biryani Packs Donation → Submit Donation
    → Real Decision Engine Execution (Community Meals NGO Selected)
    → NGO Login → View Request → Accept Request (Capacity 200 → 150)
    → Real Volunteer Dispatch Engine (Rapid Dispatch Selected)
    → Volunteer Login → Accept Assignment (Pickup In Progress)
    → Complete Delivery → Donation Completed & Volunteer Available.
"""

import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from backend.database import db
from backend.modules.donations.models import Donation
from backend.modules.ngos.models import NGO, NGODateCapacity, NGORequest
from backend.modules.volunteers.models import Volunteer, VolunteerAssignment
from backend.scripts.seed_demo_data import (
    DEMO_DONOR_EMAIL,
    DEMO_NGO_EMAIL,
    DEMO_PASSWORD,
    DEMO_VOL_EMAIL,
    seed_demo_environment,
)
from backend.shared.constants.enums import (
    AssignmentStatus,
    DonationStatus,
    OperationalStatus,
    RequestStatus,
)
from backend.tests.test_api_integration import BaseAPITest


class TestDemoE2EWorkflow(BaseAPITest):
    """Deterministic end-to-end demo workflow test suite."""

    def setUp(self):
        super().setUp()
        with self.app.app_context():
            seed_demo_environment(app=self.app, reset=True)


    def _login(self, email: str) -> str:
        res = self.client.post(
            "/api/v1/auth/login",
            data=json.dumps({"email": email, "password": DEMO_PASSWORD}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200, f"Login failed for {email}: {res.data}")
        body = json.loads(res.data)
        return body["data"]["access_token"]

    def test_complete_demo_presentation_lifecycle(self):
        """Execute the exact end-to-end demo presentation workflow."""
        # -------------------------------------------------------------------
        # 1. Food Donor: Dave's Kitchen Login & Create Donation
        # -------------------------------------------------------------------
        donor_token = self._login(DEMO_DONOR_EMAIL)

        now = datetime.now(timezone.utc)
        available_from = now.isoformat()
        expiry_time = (now + timedelta(hours=6)).isoformat()

        donation_payload = {
            "donation_title": "Fresh Veg Biryani Meal Packs",
            "description": "Freshly prepared vegetarian biryani meal packs available for community redistribution.",
            "available_from": available_from,
            "expiry_time": expiry_time,
            "total_quantity": "50.00",
            "quantity_unit": "PACKET",
            "pickup_address": "Banjara Hills, Road No. 12, Hyderabad",
            "pickup_city": "Hyderabad",
            "pickup_state": "Telangana",
            "pickup_postal_code": "500034",
            "pickup_latitude": 17.412600,
            "pickup_longitude": 78.407100,
            "delivery_preference": "PICKUP_REQUIRED",
            "special_instructions": "Packaged hygienically in sealed thermal containers.",
            "items": [
                {
                    "item_name": "Fresh Veg Biryani Meal Packs",
                    "category": "RICE",
                    "quantity": "50.00",
                    "unit": "PACKET",
                    "food_type": "VEGETARIAN",
                    "contains_allergens": False,
                }
            ],
        }

        # Create Draft Donation
        res_create = self.client.post(
            "/api/v1/donations",
            data=json.dumps(donation_payload),
            content_type="application/json",
            headers=self._auth_headers(donor_token),
        )
        self.assertEqual(res_create.status_code, 201, f"Create donation failed: {res_create.data}")
        donation_data = json.loads(res_create.data)["data"]
        donation_id = donation_data["donation_id"]
        self.assertEqual(donation_data["status"], DonationStatus.DRAFT.value)

        # Submit Donation
        res_submit = self.client.post(
            f"/api/v1/donations/{donation_id}/submit",
            headers=self._auth_headers(donor_token),
        )
        self.assertEqual(res_submit.status_code, 200, f"Submit donation failed: {res_submit.data}")
        submitted_data = json.loads(res_submit.data)["data"]
        self.assertEqual(submitted_data["status"], DonationStatus.SUBMITTED.value)

        # -------------------------------------------------------------------
        # 2. Decision / Matching Engine Execution
        # -------------------------------------------------------------------
        res_engine = self.client.post(
            "/api/v1/decision-engine/run",
            data=json.dumps({"donation_id": donation_id, "persist": True}),
            content_type="application/json",
            headers=self._auth_headers(donor_token),
        )
        self.assertEqual(res_engine.status_code, 200, f"Engine run failed: {res_engine.data}")
        engine_result = json.loads(res_engine.data)["data"]

        self.assertEqual(engine_result["selected_ngo_name"], "Community Meals NGO")
        self.assertTrue(engine_result["score"] > 0.50)
        self.assertTrue(len(engine_result["decision_reason"]) > 10)


        # Verify donation transitioned to PENDING_NGO
        with self.app.app_context():
            donation_db = db.session.get(Donation, donation_id)
            self.assertEqual(donation_db.status, DonationStatus.PENDING_NGO)

        # -------------------------------------------------------------------
        # 3. NGO Partner: Community Meals NGO Inspects & Accepts Match
        # -------------------------------------------------------------------
        ngo_token = self._login(DEMO_NGO_EMAIL)

        # Check incoming requests
        res_requests = self.client.get(
            "/api/v1/ngo/requests",
            headers=self._auth_headers(ngo_token),
        )
        self.assertEqual(res_requests.status_code, 200)
        ngo_requests = json.loads(res_requests.data)["data"]["requests"]
        self.assertTrue(len(ngo_requests) >= 1)

        target_request = next(r for r in ngo_requests if r["donation_id"] == donation_id)
        request_id = target_request["request_id"]
        self.assertEqual(target_request["status"], RequestStatus.PENDING.value)
        self.assertEqual(target_request["donation_title"], "Fresh Veg Biryani Meal Packs")

        # NGO accepts request
        res_accept_ngo = self.client.post(
            f"/api/v1/ngo/requests/{request_id}/accept",
            headers=self._auth_headers(ngo_token),
        )
        self.assertEqual(res_accept_ngo.status_code, 200, f"NGO accept failed: {res_accept_ngo.data}")

        # Verify capacity allocation & state transitions
        with self.app.app_context():
            donation_db = db.session.get(Donation, donation_id)
            self.assertEqual(donation_db.status, DonationStatus.NGO_ACCEPTED)

            ngo_req = db.session.get(NGORequest, request_id)
            self.assertEqual(ngo_req.status, RequestStatus.ACCEPTED)

            ngo = db.session.query(NGO).filter_by(organisation_name="Community Meals NGO").first()
            date_cap = db.session.query(NGODateCapacity).filter_by(ngo_id=ngo.ngo_id, date=now.date()).first()
            self.assertEqual(date_cap.allocated_meals, 50)
            self.assertEqual(date_cap.max_meals - date_cap.allocated_meals, 150)

        # -------------------------------------------------------------------
        # 4. Volunteer Driver: Rapid Dispatch Driver Accepts & Delivers
        # -------------------------------------------------------------------
        vol_token = self._login(DEMO_VOL_EMAIL)

        # Volunteer checks assignments
        res_vol_assignments = self.client.get(
            "/api/v1/volunteers/assignments",
            headers=self._auth_headers(vol_token),
        )
        self.assertEqual(res_vol_assignments.status_code, 200)
        assignments = json.loads(res_vol_assignments.data)["data"]["assignments"]
        self.assertTrue(len(assignments) >= 1)

        vol_assignment = next(a for a in assignments if a["ngo_request_id"] == request_id)
        assignment_id = vol_assignment["assignment_id"]
        self.assertEqual(vol_assignment["status"], AssignmentStatus.PENDING.value)

        # Volunteer accepts assignment
        res_vol_accept = self.client.post(
            f"/api/v1/volunteers/assignments/{assignment_id}/accept",
            headers=self._auth_headers(vol_token),
        )
        self.assertEqual(res_vol_accept.status_code, 200, f"Volunteer accept failed: {res_vol_accept.data}")

        with self.app.app_context():
            assignment_db = db.session.get(VolunteerAssignment, assignment_id)
            self.assertEqual(assignment_db.status, AssignmentStatus.ACCEPTED)

            vol = db.session.get(Volunteer, assignment_db.volunteer_id)
            self.assertEqual(vol.operational_status, OperationalStatus.BUSY)

            donation_db = db.session.get(Donation, donation_id)
            self.assertEqual(donation_db.status, DonationStatus.PICKUP_IN_PROGRESS)

        # Complete Delivery
        res_complete = self.client.post(
            f"/api/v1/volunteers/assignments/{assignment_id}/complete",
            headers=self._auth_headers(vol_token),
        )
        self.assertEqual(res_complete.status_code, 200, f"Complete delivery failed: {res_complete.data}")

        with self.app.app_context():
            vol = db.session.get(Volunteer, assignment_db.volunteer_id)
            self.assertEqual(vol.operational_status, OperationalStatus.AVAILABLE)

            donation_db = db.session.get(Donation, donation_id)
            self.assertEqual(donation_db.status, DonationStatus.COMPLETED)

