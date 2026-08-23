"""Unit and integration tests for Google OAuth Authentication and Registration."""

import json
import unittest
import uuid
from datetime import datetime, timezone
from unittest.mock import patch

from backend.app import create_app
from backend.database import db
from backend.modules.authentication.exceptions import InvalidGoogleTokenException
from backend.modules.authentication.models import User
from backend.modules.donors.models import Donor
from backend.modules.ngos.models import NGO
from backend.modules.volunteers.models import Volunteer
from backend.shared.constants.enums import AccountStatus, UserRole, VehicleType, VerificationStatus
from backend.shared.security import hash_password

_test_app = None


def get_test_app():
    global _test_app
    if _test_app is None:
        _test_app = create_app("testing")
        with _test_app.app_context():
            db.create_all()
    return _test_app


class TestGoogleAuthentication(unittest.TestCase):
    """Test suite for Google Authentication endpoint POST /api/v1/auth/google and Google Registration."""

    @classmethod
    def setUpClass(cls):
        cls.app = get_test_app()
        cls.client = cls.app.test_client()

    def setUp(self):
        self.ctx = self.app.app_context()
        self.ctx.push()
        self.test_id = uuid.uuid4().hex[:8]

    def tearDown(self):
        db.session.rollback()
        self.ctx.pop()

    @patch("backend.modules.authentication.services.verify_google_token")
    def test_google_login_existing_user_by_email_links_account(self, mock_verify):
        """Existing password user signs in with Google; account links and returns FoodBridge JWT."""
        test_email = f"donor_{self.test_id}@example.com"
        test_sub = f"google-sub-{self.test_id}"

        donor_user = User(
            email=test_email,
            password_hash=hash_password("Secure@12345"),
            role=UserRole.DONOR,
            account_status=AccountStatus.ACTIVE,
        )
        db.session.add(donor_user)
        db.session.flush()

        donor_profile = Donor(
            user_id=donor_user.user_id,
            organisation_name="Fresh Bakery",
            contact_person="Alice Smith",
            phone="9876543210",
            address="123 Market St",
            verification_status=VerificationStatus.VERIFIED,
            is_active=True,
        )
        db.session.add(donor_profile)
        db.session.commit()

        # Mock verified Google token
        mock_verify.return_value = {
            "sub": test_sub,
            "email": test_email,
            "name": "Alice Smith",
            "picture": "https://example.com/photo.jpg",
        }

        res = self.client.post(
            "/api/v1/auth/google",
            data=json.dumps({"credential": "mock_google_id_token"}),
            content_type="application/json",
        )

        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data["success"])
        self.assertEqual(data["message"], "Google login successful.")
        self.assertFalse(data["data"]["is_new_user"])
        self.assertIn("access_token", data["data"])
        self.assertEqual(data["data"]["user"]["email"], test_email)
        self.assertEqual(data["data"]["user"]["role"], "DONOR")

        # Verify Google sub was linked
        updated_user = db.session.query(User).filter_by(email=test_email).first()
        self.assertEqual(updated_user.google_subject_id, test_sub)

    @patch("backend.modules.authentication.services.verify_google_token")
    def test_google_login_existing_user_by_google_sub(self, mock_verify):
        """User already has google_subject_id saved; logs in immediately."""
        test_email = f"vol_{self.test_id}@example.com"
        test_sub = f"sub_{self.test_id}"

        user = User(
            email=test_email,
            password_hash=None,
            google_subject_id=test_sub,
            role=UserRole.VOLUNTEER,
            account_status=AccountStatus.ACTIVE,
        )
        db.session.add(user)
        db.session.flush()

        vol = Volunteer(
            user_id=user.user_id,
            phone="9988776655",
            vehicle_type=VehicleType.CAR,
            verification_status=VerificationStatus.VERIFIED,
            is_active=True,
        )
        db.session.add(vol)
        db.session.commit()

        mock_verify.return_value = {
            "sub": test_sub,
            "email": test_email,
            "name": "Bob Driver",
        }

        res = self.client.post(
            "/api/v1/auth/google",
            data=json.dumps({"credential": "valid_token"}),
            content_type="application/json",
        )

        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertFalse(data["data"]["is_new_user"])
        self.assertEqual(data["data"]["user"]["role"], "VOLUNTEER")

    @patch("backend.modules.authentication.services.verify_google_token")
    def test_google_login_new_user_returns_registration_metadata(self, mock_verify):
        """Unrecognized Google user receives is_new_user=True and verified profile info."""
        test_email = f"new_{self.test_id}@gmail.com"
        test_sub = f"sub_new_{self.test_id}"

        mock_verify.return_value = {
            "sub": test_sub,
            "email": test_email,
            "name": "Jane New",
            "picture": "https://example.com/jane.jpg",
        }

        res = self.client.post(
            "/api/v1/auth/google",
            data=json.dumps({"credential": "new_user_token"}),
            content_type="application/json",
        )

        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data["success"])
        self.assertTrue(data["data"]["is_new_user"])
        self.assertEqual(data["data"]["email"], test_email)
        self.assertEqual(data["data"]["google_subject_id"], test_sub)
        self.assertEqual(data["data"]["name"], "Jane New")

    def test_google_register_donor_success(self):
        """Register a new DONOR user with verified google_subject_id (no password required)."""
        test_email = f"reg_donor_{self.test_id}@example.com"
        test_sub = f"reg_sub_{self.test_id}"

        payload = {
            "email": test_email,
            "google_subject_id": test_sub,
            "role": "DONOR",
            "profile": {
                "organisation_name": "Sunrise Cafe",
                "contact_person": "Sam Sunrise",
                "phone": "9876501234",
                "address": "45 Ocean Drive",
            },
        }

        res = self.client.post(
            "/api/v1/auth/register",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        self.assertTrue(data["success"])
        self.assertEqual(data["data"]["account_status"], "ACTIVE")

        # Verify in DB
        created = db.session.query(User).filter_by(email=test_email).first()
        self.assertIsNotNone(created)
        self.assertEqual(created.google_subject_id, test_sub)
        self.assertIsNone(created.password_hash)
        self.assertEqual(created.role, UserRole.DONOR)

    def test_google_register_ngo_pending_status(self):
        """Register a new NGO user with google_subject_id; gets PENDING status."""
        test_email = f"reg_ngo_{self.test_id}@example.com"
        test_sub = f"reg_ngo_sub_{self.test_id}"
        test_reg_num = f"NGO-GOOG-{self.test_id}"

        payload = {
            "email": test_email,
            "google_subject_id": test_sub,
            "role": "NGO",
            "profile": {
                "organisation_name": "Hope Foundation",
                "registration_number": test_reg_num,
                "contact_person": "Helen Hope",
                "phone": "9876505678",
                "address": "12 Charity Lane",
                "service_radius_km": 20,
            },
        }

        res = self.client.post(
            "/api/v1/auth/register",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        self.assertEqual(data["data"]["account_status"], "PENDING")

    def test_google_register_volunteer_success(self):
        """Register a new VOLUNTEER with google_subject_id."""
        test_email = f"reg_vol_{self.test_id}@example.com"
        test_sub = f"reg_vol_sub_{self.test_id}"

        payload = {
            "email": test_email,
            "google_subject_id": test_sub,
            "role": "VOLUNTEER",
            "profile": {
                "phone": "9876509999",
                "vehicle_type": "BIKE",
            },
        }

        res = self.client.post(
            "/api/v1/auth/register",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        self.assertEqual(data["data"]["account_status"], "ACTIVE")

    @patch("backend.modules.authentication.services.verify_google_token")
    def test_google_login_suspended_account_rejected(self, mock_verify):
        """Suspended user cannot log in with Google (401 ACCOUNT_NOT_ACTIVE)."""
        test_email = f"susp_{self.test_id}@example.com"
        test_sub = f"sub_susp_{self.test_id}"

        user = User(
            email=test_email,
            google_subject_id=test_sub,
            role=UserRole.DONOR,
            account_status=AccountStatus.SUSPENDED,
        )
        db.session.add(user)
        db.session.commit()

        mock_verify.return_value = {
            "sub": test_sub,
            "email": test_email,
        }

        res = self.client.post(
            "/api/v1/auth/google",
            data=json.dumps({"credential": "token_for_suspended"}),
            content_type="application/json",
        )

        self.assertEqual(res.status_code, 401)
        data = json.loads(res.data)
        self.assertEqual(data["error"]["code"], "ACCOUNT_NOT_ACTIVE")

    @patch("backend.modules.authentication.services.verify_google_token")
    def test_google_login_invalid_token_rejected(self, mock_verify):
        """Invalid Google token raises InvalidGoogleTokenException -> 401."""
        mock_verify.side_effect = InvalidGoogleTokenException("Invalid token signature.")

        res = self.client.post(
            "/api/v1/auth/google",
            data=json.dumps({"credential": "bad_token"}),
            content_type="application/json",
        )

        self.assertEqual(res.status_code, 401)
        data = json.loads(res.data)
        self.assertEqual(data["error"]["code"], "INVALID_GOOGLE_TOKEN")

    def test_google_auth_missing_body_rejected(self):
        """Empty request body returns 422 VALIDATION_ERROR."""
        res = self.client.post(
            "/api/v1/auth/google",
            data=json.dumps({}),
            content_type="application/json",
        )

        self.assertEqual(res.status_code, 422)

    def test_standard_login_still_works_for_linked_account(self):
        """User who linked Google account can still login using their email/password."""
        test_email = f"dual_{self.test_id}@example.com"
        test_sub = f"dual_sub_{self.test_id}"

        user = User(
            email=test_email,
            password_hash=hash_password("Secure@12345"),
            google_subject_id=test_sub,
            role=UserRole.DONOR,
            account_status=AccountStatus.ACTIVE,
        )
        db.session.add(user)
        db.session.commit()

        res = self.client.post(
            "/api/v1/auth/login",
            data=json.dumps({"email": test_email, "password": "Secure@12345"}),
            content_type="application/json",
        )

        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data["success"])
        self.assertIn("access_token", data["data"])

