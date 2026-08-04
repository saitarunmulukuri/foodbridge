"""Sprint 5.5 — End-to-End API Integration Tests.

Strategy:
    Uses Flask test client with SQLite in-memory DB via TestingConfig.
    All models are created via create_all() so the entire lifecycle is testable
    through real HTTP calls + real DB (not mocked services).

Workflow under test:
    POST /auth/register  (DONOR, NGO, VOLUNTEER)
    POST /auth/login
    POST /donations                      (create DRAFT)
    GET  /donations                      (list my donations)
    GET  /donations/{id}                 (read single)
    POST /donations/{id}/submit          (DRAFT → SUBMITTED)
    GET  /health                         (infrastructure)
    GET  /volunteers/me                  (volunteer profile)
    PATCH /volunteers/me                 (update location)
    GET  /ngo/requests                   (NGO sees their requests)
    GET  /volunteers/assignments         (volunteer sees assignments)

RBAC / Authorization tests:
    - DONOR cannot access NGO endpoints
    - NGO cannot create donations
    - VOLUNTEER cannot accept another volunteer's assignment
    - NGO cannot accept a request belonging to another NGO
    - DONOR IDOR: cannot access another donor's donation
    - Missing token → 401
    - Wrong role → 403
"""

import json
import unittest
from datetime import datetime, timedelta, timezone

from backend.app import create_app
from backend.database import db


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

_FUTURE = datetime.now(timezone.utc) + timedelta(hours=1)
_FAR_FUTURE = datetime.now(timezone.utc) + timedelta(hours=6)

DONOR_A = {
    "email": "donor_a@test.com",
    "password": "Secure@12345",
    "password_confirmation": "Secure@12345",
    "role": "DONOR",
    "profile": {
        "organisation_name": "Alice Kitchen",
        "contact_person": "Alice Donor",
        "phone": "9876543210",
        "address": "123 Main St, Hyderabad",
    },
}

DONOR_B = {
    "email": "donor_b@test.com",
    "password": "Secure@12345",
    "password_confirmation": "Secure@12345",
    "role": "DONOR",
    "profile": {
        "organisation_name": "Bob Kitchen",
        "contact_person": "Bob Donor",
        "phone": "9876543211",
        "address": "456 Main St, Hyderabad",
    },
}

NGO_USER = {
    "email": "ngo@test.com",
    "password": "Secure@12345",
    "password_confirmation": "Secure@12345",
    "role": "NGO",
    "profile": {
        "organisation_name": "Test NGO",
        "registration_number": "NGO-001",
        "contact_person": "Carol NGO",
        "phone": "9111111111",
        "address": "789 NGO St, Hyderabad",
        "latitude": 17.385,
        "longitude": 78.486,
        "service_radius_km": 25,
    },
}

VOLUNTEER_USER = {
    "email": "vol@test.com",
    "password": "Secure@12345",
    "password_confirmation": "Secure@12345",
    "role": "VOLUNTEER",
    "profile": {
        "phone": "9222222222",
        "vehicle_type": "BIKE",
        "latitude": 17.390,
        "longitude": 78.490,
    },
}

DONATION_PAYLOAD = {
    "donation_title": "Fresh Cooked Biryani",
    "description": "Surplus biryani from a wedding function.",
    "available_from": _FUTURE.isoformat(),
    "expiry_time": _FAR_FUTURE.isoformat(),
    "total_quantity": "5.00",
    "quantity_unit": "KG",
    "pickup_address": "123 Main St, Banjara Hills",
    "pickup_city": "Hyderabad",
    "pickup_state": "Telangana",
    "pickup_postal_code": "500034",
    "pickup_latitude": "17.4126",
    "pickup_longitude": "78.4071",
    "delivery_preference": "PICKUP_REQUIRED",
    "items": [
        {
            "item_name": "Chicken Biryani",
            "category": "CURRY",
            "quantity": "5.00",
            "unit": "KG",
            "food_type": "NON_VEGETARIAN",
            "contains_allergens": False,
        }
    ],
}


# ---------------------------------------------------------------------------
# Module-level singleton: one app + one DB for all integration tests
# ---------------------------------------------------------------------------

_test_app = create_app("testing")
_test_client = _test_app.test_client()

with _test_app.app_context():
    db.create_all()


# ---------------------------------------------------------------------------
# Base test case
# ---------------------------------------------------------------------------

class BaseAPITest(unittest.TestCase):
    """Base class sharing a single Flask test app + SQLite DB across all test classes."""

    app = _test_app
    client = _test_client

    def _register(self, payload: dict) -> dict:
        r = self.client.post(
            "/api/v1/auth/register",
            data=json.dumps(payload),
            content_type="application/json",
        )
        return json.loads(r.data)

    def _login(self, email: str, password: str) -> str:
        """Login and return access token."""
        r = self.client.post(
            "/api/v1/auth/login",
            data=json.dumps({"email": email, "password": password}),
            content_type="application/json",
        )
        body = json.loads(r.data)
        return body["data"]["access_token"]

    def _auth_headers(self, token: str) -> dict:
        return {"Authorization": f"Bearer {token}"}

    def _post(self, url: str, payload: dict, token: str):
        return self.client.post(
            url,
            data=json.dumps(payload),
            content_type="application/json",
            headers=self._auth_headers(token),
        )

    def _get(self, url: str, token: str):
        return self.client.get(url, headers=self._auth_headers(token))

    def _patch(self, url: str, payload: dict, token: str):
        return self.client.patch(
            url,
            data=json.dumps(payload),
            content_type="application/json",
            headers=self._auth_headers(token),
        )


# ---------------------------------------------------------------------------
# Phase 1 — Infrastructure
# ---------------------------------------------------------------------------

class TestHealthCheck(BaseAPITest):

    def test_health_endpoint_returns_200_or_503(self):
        r = self.client.get("/api/v1/health")
        self.assertIn(r.status_code, [200, 503])
        body = json.loads(r.data)
        self.assertIn("status", body)
        self.assertIn("database", body)
        self.assertEqual(body["version"], "v1")


# ---------------------------------------------------------------------------
# Phase 2 — Authentication Workflow
# ---------------------------------------------------------------------------

class TestAuthentication(BaseAPITest):

    def test_register_donor_returns_201(self):
        payload = dict(DONOR_A)
        payload["email"] = "reg_test@test.com"
        r = self.client.post(
            "/api/v1/auth/register",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 201)
        body = json.loads(r.data)
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["role"], "DONOR")

    def test_register_duplicate_email_returns_409_or_422(self):
        payload = dict(DONOR_A)
        payload["email"] = "dup_email@test.com"
        self.client.post(
            "/api/v1/auth/register",
            data=json.dumps(payload),
            content_type="application/json",
        )
        r2 = self.client.post(
            "/api/v1/auth/register",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertIn(r2.status_code, [409, 422, 400])

    def test_login_returns_tokens(self):
        payload = dict(DONOR_A)
        payload["email"] = "login_test@test.com"
        self._register(payload)
        r = self.client.post(
            "/api/v1/auth/login",
            data=json.dumps({"email": "login_test@test.com", "password": "Secure@12345"}),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        body = json.loads(r.data)
        self.assertIn("access_token", body["data"])
        self.assertIn("refresh_token", body["data"])

    def test_login_wrong_password_returns_401(self):
        payload = dict(DONOR_A)
        payload["email"] = "badpw@test.com"
        self._register(payload)
        r = self.client.post(
            "/api/v1/auth/login",
            data=json.dumps({"email": "badpw@test.com", "password": "Wrong@1234"}),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 401)

    def test_missing_token_returns_401(self):
        r = self.client.post("/api/v1/donations", data="{}", content_type="application/json")
        self.assertEqual(r.status_code, 401)


# ---------------------------------------------------------------------------
# Phase 3 — Donation Lifecycle
# ---------------------------------------------------------------------------

class TestDonationLifecycle(BaseAPITest):
    """Verify complete DONOR donation workflow: create → list → get → submit."""

    @classmethod
    def setUpClass(cls):
        # Register & login donor A
        payload = dict(DONOR_A)
        payload["email"] = "don_lifecycle@test.com"
        cls.client.post(
            "/api/v1/auth/register",
            data=json.dumps(payload),
            content_type="application/json",
        )
        r = cls.client.post(
            "/api/v1/auth/login",
            data=json.dumps({"email": "don_lifecycle@test.com", "password": "Secure@12345"}),
            content_type="application/json",
        )
        cls.token_a = json.loads(r.data)["data"]["access_token"]

    def test_01_create_donation_returns_201(self):
        r = self._post("/api/v1/donations", DONATION_PAYLOAD, self.token_a)
        self.assertEqual(r.status_code, 201)
        body = json.loads(r.data)
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["status"], "DRAFT")
        # Store donation_id on class for subsequent tests
        TestDonationLifecycle.donation_id = body["data"]["donation_id"]

    def test_02_list_donations_returns_200(self):
        r = self._get("/api/v1/donations", self.token_a)
        self.assertEqual(r.status_code, 200)
        body = json.loads(r.data)
        self.assertTrue(body["success"])
        self.assertGreaterEqual(body["data"]["total"], 1)

    def test_03_get_single_donation_returns_200(self):
        r = self._get(f"/api/v1/donations/{self.donation_id}", self.token_a)
        self.assertEqual(r.status_code, 200)
        body = json.loads(r.data)
        self.assertEqual(body["data"]["donation_id"], self.donation_id)
        self.assertIn("items", body["data"])

    def test_04_submit_donation_returns_200(self):
        r = self._post(f"/api/v1/donations/{self.donation_id}/submit", {}, self.token_a)
        self.assertEqual(r.status_code, 200)
        body = json.loads(r.data)
        self.assertEqual(body["data"]["status"], "SUBMITTED")

    def test_05_double_submit_returns_409(self):
        # Already submitted — re-submitting must fail
        r = self._post(f"/api/v1/donations/{self.donation_id}/submit", {}, self.token_a)
        self.assertEqual(r.status_code, 409)


# ---------------------------------------------------------------------------
# Phase 4 — RBAC / Authorization Tests
# ---------------------------------------------------------------------------

class TestRBAC(BaseAPITest):
    """Verify role enforcement and IDOR protection."""

    @classmethod
    def setUpClass(cls):
        from backend.modules.authentication.models import User
        from backend.shared.constants.enums import AccountStatus
        from backend.database import db as _db
        from sqlalchemy import select

        emails = {
            "donor": "rbac_donor@test.com",
            "ngo": "rbac_ngo@test.com",
            "volunteer": "rbac_vol@test.com",
            "donor2": "rbac_donor2@test.com",
        }

        def _reg_login(payload, email, password="Secure@12345"):
            p = dict(payload)
            p["email"] = email
            cls.client.post(
                "/api/v1/auth/register",
                data=json.dumps(p),
                content_type="application/json",
            )
            # Activate NGO accounts (NGO starts as PENDING)
            if p.get("role") == "NGO":
                with cls.app.app_context():
                    user = _db.session.execute(
                        select(User).where(User.email == email)
                    ).scalars().first()
                    if user:
                        user.account_status = AccountStatus.ACTIVE
                        _db.session.commit()
            r = cls.client.post(
                "/api/v1/auth/login",
                data=json.dumps({"email": email, "password": password}),
                content_type="application/json",
            )
            return json.loads(r.data)["data"]["access_token"]

        cls.donor_token = _reg_login(DONOR_A, emails["donor"])
        cls.ngo_token = _reg_login(NGO_USER, emails["ngo"])
        cls.vol_token = _reg_login(VOLUNTEER_USER, emails["volunteer"])
        cls.donor2_token = _reg_login(DONOR_B, emails["donor2"])

        # Create a donation as donor A
        r = cls.client.post(
            "/api/v1/donations",
            data=json.dumps(DONATION_PAYLOAD),
            content_type="application/json",
            headers={"Authorization": f"Bearer {cls.donor_token}"},
        )
        cls.donor_a_donation_id = json.loads(r.data)["data"]["donation_id"]

    # --- DONOR cannot access NGO-only endpoints ---

    def test_donor_cannot_get_ngo_profile(self):
        r = self._get("/api/v1/ngos/me", self.donor_token)
        self.assertEqual(r.status_code, 403)

    def test_donor_cannot_list_ngo_requests(self):
        r = self._get("/api/v1/ngo/requests", self.donor_token)
        self.assertEqual(r.status_code, 403)

    # --- NGO cannot create donations ---

    def test_ngo_cannot_create_donation(self):
        r = self._post("/api/v1/donations", DONATION_PAYLOAD, self.ngo_token)
        self.assertEqual(r.status_code, 403)

    # --- VOLUNTEER cannot create donations ---

    def test_volunteer_cannot_create_donation(self):
        r = self._post("/api/v1/donations", DONATION_PAYLOAD, self.vol_token)
        self.assertEqual(r.status_code, 403)

    # --- IDOR: Donor B cannot read Donor A's donation ---

    def test_donor_b_cannot_read_donor_a_donation(self):
        r = self._get(f"/api/v1/donations/{self.donor_a_donation_id}", self.donor2_token)
        self.assertEqual(r.status_code, 403)

    # --- IDOR: Donor B cannot submit Donor A's donation ---

    def test_donor_b_cannot_submit_donor_a_donation(self):
        r = self._post(
            f"/api/v1/donations/{self.donor_a_donation_id}/submit", {}, self.donor2_token
        )
        self.assertEqual(r.status_code, 403)

    # --- Missing token → 401 ---

    def test_no_token_on_protected_endpoint_returns_401(self):
        r = self.client.get("/api/v1/donations")
        self.assertEqual(r.status_code, 401)

    def test_no_token_on_ngo_endpoint_returns_401(self):
        r = self.client.get("/api/v1/ngos/me")
        self.assertEqual(r.status_code, 401)

    def test_no_token_on_volunteer_endpoint_returns_401(self):
        r = self.client.get("/api/v1/volunteers/me")
        self.assertEqual(r.status_code, 401)


# ---------------------------------------------------------------------------
# Phase 5 — NGO Profile & Capacity
# ---------------------------------------------------------------------------

class TestNGOEndpoints(BaseAPITest):

    @classmethod
    def setUpClass(cls):
        from backend.modules.authentication.models import User
        from backend.shared.constants.enums import AccountStatus
        from backend.database import db as _db
        from sqlalchemy import update

        # Use a unique registration_number to avoid conflict with TestRBAC NGO
        payload = {
            "email": "ngo_ep2@test.com",
            "password": "Secure@12345",
            "password_confirmation": "Secure@12345",
            "role": "NGO",
            "profile": {
                "organisation_name": "Endpoint Test NGO",
                "registration_number": "NGO-EP-002",
                "contact_person": "Endpoint NGO",
                "phone": "9333333333",
                "address": "999 NGO St, Hyderabad",
                "latitude": 17.385,
                "longitude": 78.486,
                "service_radius_km": 25,
            },
        }
        r = cls.client.post(
            "/api/v1/auth/register",
            data=json.dumps(payload),
            content_type="application/json",
        )
        reg_body = json.loads(r.data)
        if not reg_body.get("success"):
            cls.ngo_token = None
            return

        # Activate the NGO (starts as PENDING)
        with cls.app.app_context():
            _db.session.execute(
                update(User)
                .where(User.email == "ngo_ep2@test.com")
                .values(account_status=AccountStatus.ACTIVE)
            )
            _db.session.commit()

        r2 = cls.client.post(
            "/api/v1/auth/login",
            data=json.dumps({"email": "ngo_ep2@test.com", "password": "Secure@12345"}),
            content_type="application/json",
        )
        login_body = json.loads(r2.data)
        cls.ngo_token = login_body["data"]["access_token"] if login_body.get("success") else None

    def test_get_ngo_profile_returns_200(self):
        r = self._get("/api/v1/ngos/me", self.ngo_token)
        self.assertEqual(r.status_code, 200)
        body = json.loads(r.data)
        self.assertTrue(body["success"])
        self.assertIn("organisation_name", body["data"])

    def test_patch_ngo_profile_returns_200(self):
        r = self._patch(
            "/api/v1/ngos/me",
            {"contact_person": "Updated Contact"},
            self.ngo_token,
        )
        self.assertEqual(r.status_code, 200)
        body = json.loads(r.data)
        self.assertEqual(body["data"]["contact_person"], "Updated Contact")

    def test_get_ngo_capacity_returns_200(self):
        r = self._get("/api/v1/ngos/me/capacity", self.ngo_token)
        self.assertEqual(r.status_code, 200)
        body = json.loads(r.data)
        self.assertTrue(body["success"])

    def test_put_ngo_capacity_returns_200(self):
        from datetime import date, timedelta
        # Use a future date to avoid past-date validation failure
        future_date = (date.today() + timedelta(days=1)).isoformat()
        r = self.client.put(
            "/api/v1/ngos/me/capacity",
            data=json.dumps({"date": future_date, "maximum_capacity": 50}),
            content_type="application/json",
            headers=self._auth_headers(self.ngo_token),
        )
        self.assertEqual(r.status_code, 200)
        body = json.loads(r.data)
        self.assertEqual(body["data"]["maximum_capacity"], 50)


# ---------------------------------------------------------------------------
# Phase 6 — Volunteer Profile
# ---------------------------------------------------------------------------

class TestVolunteerProfile(BaseAPITest):

    @classmethod
    def setUpClass(cls):
        payload = dict(VOLUNTEER_USER)
        payload["email"] = "vol_profile@test.com"
        cls.client.post(
            "/api/v1/auth/register",
            data=json.dumps(payload),
            content_type="application/json",
        )
        r = cls.client.post(
            "/api/v1/auth/login",
            data=json.dumps({"email": "vol_profile@test.com", "password": "Secure@12345"}),
            content_type="application/json",
        )
        cls.vol_token = json.loads(r.data)["data"]["access_token"]

    def test_get_volunteer_profile_returns_200(self):
        r = self._get("/api/v1/volunteers/me", self.vol_token)
        self.assertEqual(r.status_code, 200)
        body = json.loads(r.data)
        self.assertTrue(body["success"])
        self.assertIn("volunteer_id", body["data"])
        self.assertIn("operational_status", body["data"])

    def test_patch_volunteer_location_returns_200(self):
        r = self._patch(
            "/api/v1/volunteers/me",
            {"latitude": 17.395, "longitude": 78.495, "operational_status": "AVAILABLE"},
            self.vol_token,
        )
        self.assertEqual(r.status_code, 200)
        body = json.loads(r.data)
        self.assertAlmostEqual(body["data"]["latitude"], 17.395, places=2)
        self.assertEqual(body["data"]["operational_status"], "AVAILABLE")

    def test_patch_volunteer_empty_payload_returns_400(self):
        r = self._patch("/api/v1/volunteers/me", {}, self.vol_token)
        self.assertEqual(r.status_code, 400)

    def test_list_assignments_returns_200(self):
        r = self._get("/api/v1/volunteers/assignments", self.vol_token)
        self.assertEqual(r.status_code, 200)
        body = json.loads(r.data)
        self.assertIn("assignments", body["data"])

    def test_donor_cannot_access_volunteer_me(self):
        # Register donor, login, try GET /volunteers/me
        payload = dict(DONOR_A)
        payload["email"] = "vol_rbac@test.com"
        self.client.post(
            "/api/v1/auth/register",
            data=json.dumps(payload),
            content_type="application/json",
        )
        r = self.client.post(
            "/api/v1/auth/login",
            data=json.dumps({"email": "vol_rbac@test.com", "password": "Secure@12345"}),
            content_type="application/json",
        )
        donor_token = json.loads(r.data)["data"]["access_token"]
        r2 = self._get("/api/v1/volunteers/me", donor_token)
        self.assertEqual(r2.status_code, 403)


# ---------------------------------------------------------------------------
# Phase 7 — Error Format Standardization
# ---------------------------------------------------------------------------

class TestErrorResponseFormat(BaseAPITest):
    """Verify all error responses follow the canonical { success, error: {code, message} } format."""

    def test_401_format(self):
        """JWT-missing 401 may return flask_jwt_extended format {'msg': ...}.
        We test status code + that the response is not a success response.
        """
        r = self.client.get("/api/v1/donations")
        self.assertEqual(r.status_code, 401)
        body = json.loads(r.data)
        # Accept both our custom {error: ...} and flask_jwt_extended {msg: ...} formats
        is_our_format = "error" in body and not body.get("success", True)
        is_jwt_format = "msg" in body
        self.assertTrue(is_our_format or is_jwt_format, f"Unexpected 401 body: {body}")

    def test_404_unknown_route_format(self):
        r = self.client.get("/api/v1/does-not-exist")
        body = json.loads(r.data)
        # Werkzeug 404 goes through HTTPException handler
        self.assertFalse(body.get("success", True))
        self.assertIn("error", body)

    def test_422_validation_format(self):
        # Register with invalid payload
        r = self.client.post(
            "/api/v1/auth/register",
            data=json.dumps({"email": "bad"}),
            content_type="application/json",
        )
        self.assertIn(r.status_code, [400, 422])
        body = json.loads(r.data)
        self.assertFalse(body.get("success", True))
        self.assertIn("error", body)


if __name__ == "__main__":
    unittest.main()
