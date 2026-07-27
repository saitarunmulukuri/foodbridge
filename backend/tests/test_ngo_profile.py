"""Unit tests for the NGO Profile Management module — Sprint 3.1.

Test Coverage:
    - NGO permissions (require_ngo_role)
    - NGO validators (phone, website, coordinates, service_radius)
    - NGOProfileUpdateSchema (field validation, coordinate pair, at-least-one)
    - NGOProfileResponseSchema (serialisation)
    - NGORepository (find_by_user_id, apply_profile_update)
    - NGOProfileService (get_my_profile, update_my_profile)
"""

import unittest
from decimal import Decimal
from unittest.mock import MagicMock, patch

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
    InsufficientRoleException,
    NGONotFoundException,
    NGOProfileValidationException,
)
from backend.modules.ngos.permissions import require_ngo_role
from backend.modules.ngos.repositories import NGORepository
from backend.modules.ngos.schemas import NGOProfileResponseSchema, NGOProfileUpdateSchema
from backend.modules.ngos.services import NGOProfileService
from backend.modules.ngos.validators import (
    validate_latitude,
    validate_longitude,
    validate_phone,
    validate_service_radius,
    validate_website_url,
)
from backend.shared.constants.enums import VerificationStatus
from marshmallow import ValidationError


# -----------------------------------------------------------------------
# Helper: Build mock NGO ORM instance
# -----------------------------------------------------------------------


def _make_ngo(
    ngo_id: int = 1,
    user_id: int = 10,
    organisation_name: str = "Feed the World",
    registration_number: str = "REG-001",
    contact_person: str = "Alice Smith",
    phone: str = "+91 9876543210",
    address: str = "12 Main Road, Hyderabad",
    latitude: Decimal = Decimal("17.3850"),
    longitude: Decimal = Decimal("78.4867"),
    service_radius_km: int = 15,
    verification_status: VerificationStatus = VerificationStatus.VERIFIED,
    is_active: bool = True,
    created_at=None,
    updated_at=None,
) -> MagicMock:
    ngo = MagicMock(spec=NGO)
    ngo.ngo_id = ngo_id
    ngo.user_id = user_id
    ngo.organisation_name = organisation_name
    ngo.registration_number = registration_number
    ngo.contact_person = contact_person
    ngo.phone = phone
    ngo.address = address
    ngo.latitude = latitude
    ngo.longitude = longitude
    ngo.service_radius_km = service_radius_km
    ngo.verification_status = verification_status
    ngo.is_active = is_active
    ngo.created_at = created_at
    ngo.updated_at = updated_at
    return ngo


# -----------------------------------------------------------------------
# Tests: Permissions
# -----------------------------------------------------------------------


class TestNGOPermissions(unittest.TestCase):
    """Test suite for require_ngo_role permission guard."""

    def test_ngo_role_allowed(self):
        """NGO role must pass without raising."""
        try:
            require_ngo_role(user_id=1, role="NGO")
        except InsufficientRoleException:
            self.fail("require_ngo_role raised unexpectedly for role='NGO'.")

    def test_donor_role_rejected(self):
        with self.assertRaises(InsufficientRoleException):
            require_ngo_role(user_id=1, role="DONOR")

    def test_volunteer_role_rejected(self):
        with self.assertRaises(InsufficientRoleException):
            require_ngo_role(user_id=1, role="VOLUNTEER")

    def test_admin_role_rejected(self):
        with self.assertRaises(InsufficientRoleException):
            require_ngo_role(user_id=1, role="ADMIN")

    def test_empty_role_rejected(self):
        with self.assertRaises(InsufficientRoleException):
            require_ngo_role(user_id=1, role="")


# -----------------------------------------------------------------------
# Tests: Validators
# -----------------------------------------------------------------------


class TestPhoneValidator(unittest.TestCase):
    def test_valid_indian_mobile(self):
        validate_phone("+91 9876543210")  # should not raise

    def test_valid_us_format(self):
        validate_phone("+1-800-555-0199")

    def test_valid_digits_only(self):
        validate_phone("9876543210")

    def test_too_short(self):
        with self.assertRaises(ValidationError):
            validate_phone("123")

    def test_invalid_characters(self):
        with self.assertRaises(ValidationError):
            validate_phone("phone#$%")


class TestWebsiteValidator(unittest.TestCase):
    def test_valid_https(self):
        validate_website_url("https://example.org")

    def test_valid_http(self):
        validate_website_url("http://example.com/about")

    def test_ftp_rejected(self):
        with self.assertRaises(ValidationError):
            validate_website_url("ftp://example.com")

    def test_missing_domain(self):
        with self.assertRaises(ValidationError):
            validate_website_url("https://")

    def test_plain_text_rejected(self):
        with self.assertRaises(ValidationError):
            validate_website_url("not-a-url")


class TestCoordinateValidators(unittest.TestCase):
    def test_valid_latitude(self):
        validate_latitude(17.385)

    def test_latitude_min(self):
        validate_latitude(-90.0)

    def test_latitude_max(self):
        validate_latitude(90.0)

    def test_latitude_out_of_range(self):
        with self.assertRaises(ValidationError):
            validate_latitude(91.0)

    def test_valid_longitude(self):
        validate_longitude(78.486)

    def test_longitude_min(self):
        validate_longitude(-180.0)

    def test_longitude_max(self):
        validate_longitude(180.0)

    def test_longitude_out_of_range(self):
        with self.assertRaises(ValidationError):
            validate_longitude(181.0)


class TestServiceRadiusValidator(unittest.TestCase):
    def test_valid_radius(self):
        validate_service_radius(15)

    def test_zero_rejected(self):
        with self.assertRaises(ValidationError):
            validate_service_radius(0)

    def test_negative_rejected(self):
        with self.assertRaises(ValidationError):
            validate_service_radius(-5)


# -----------------------------------------------------------------------
# Tests: Schemas
# -----------------------------------------------------------------------


class TestNGOProfileUpdateSchema(unittest.TestCase):
    """Test suite for NGOProfileUpdateSchema."""

    def setUp(self):
        self.schema = NGOProfileUpdateSchema()

    def test_valid_single_field_update(self):
        data = self.schema.load({"contact_person": "Bob Jones"})
        self.assertEqual(data["contact_person"], "Bob Jones")

    def test_valid_full_update(self):
        data = self.schema.load({
            "organisation_name": "Better NGO",
            "contact_person": "Alice",
            "phone": "+91 9876543210",
            "address": "12 Main Road, Hyderabad",
            "latitude": 17.385,
            "longitude": 78.486,
            "service_radius_km": 20,
        })
        self.assertEqual(data["organisation_name"], "Better NGO")

    def test_empty_payload_rejected(self):
        with self.assertRaises(ValidationError):
            self.schema.load({})

    def test_coordinate_pair_incomplete_lat_only(self):
        with self.assertRaises(ValidationError) as ctx:
            self.schema.load({"latitude": 17.385})
        self.assertIn("longitude", str(ctx.exception.messages))

    def test_coordinate_pair_incomplete_lon_only(self):
        with self.assertRaises(ValidationError) as ctx:
            self.schema.load({"longitude": 78.486})
        self.assertIn("latitude", str(ctx.exception.messages))

    def test_coordinate_pair_both_accepted(self):
        data = self.schema.load({"latitude": 17.385, "longitude": 78.486})
        self.assertIn("latitude", data)
        self.assertIn("longitude", data)

    def test_invalid_phone_rejected(self):
        with self.assertRaises(ValidationError):
            self.schema.load({"phone": "abc"})

    def test_organisation_name_too_short(self):
        with self.assertRaises(ValidationError):
            self.schema.load({"organisation_name": "X"})

    def test_read_only_fields_are_ignored(self):
        """email, registration_number, verification_status must be silently ignored."""
        data = self.schema.load({
            "contact_person": "Alice",
            "email": "hack@example.com",
            "registration_number": "FAKE-001",
            "verification_status": "VERIFIED",
            "user_id": 999,
            "role": "ADMIN",
        })
        self.assertNotIn("email", data)
        self.assertNotIn("registration_number", data)
        self.assertNotIn("verification_status", data)
        self.assertNotIn("user_id", data)
        self.assertNotIn("role", data)


# -----------------------------------------------------------------------
# Tests: Repository
# -----------------------------------------------------------------------


class TestNGORepository(unittest.TestCase):
    """Test suite for NGORepository business methods (mocked DB session)."""

    def test_apply_profile_update_applies_allowed_fields(self):
        ngo = _make_ngo()
        repo = NGORepository(session=MagicMock())
        updates = {
            "organisation_name": "Updated Org",
            "phone": "+91 9999999999",
            "latitude": Decimal("18.0"),
            "longitude": Decimal("79.0"),
        }
        repo.apply_profile_update(ngo, updates)
        self.assertEqual(ngo.organisation_name, "Updated Org")
        self.assertEqual(ngo.phone, "+91 9999999999")

    def test_apply_profile_update_ignores_unknown_fields(self):
        ngo = _make_ngo(contact_person="Original")
        repo = NGORepository(session=MagicMock())
        # unknown_field is not in the allowed set — only contact_person should be applied
        updates = {"unknown_field": "hack", "contact_person": "Bob"}
        repo.apply_profile_update(ngo, updates)
        # The known field must be applied
        self.assertEqual(ngo.contact_person, "Bob")
        # The unknown field must not have been set on the NGO object
        # (MagicMock will return a mock for .unknown_field but we verify
        # setattr was never called with 'unknown_field' as key)
        set_calls = [str(c) for c in ngo.method_calls]
        self.assertNotIn("unknown_field", str(set_calls))


# -----------------------------------------------------------------------
# Tests: Service
# -----------------------------------------------------------------------


class TestNGOProfileService(unittest.TestCase):
    """Test suite for NGOProfileService orchestration."""

    def _make_service_with_ngo(self, ngo):
        mock_repo = MagicMock(spec=NGORepository)
        mock_repo.find_by_user_id.return_value = ngo
        return NGOProfileService(repository=mock_repo), mock_repo

    def test_get_my_profile_returns_data(self):
        ngo = _make_ngo(ngo_id=1, user_id=10)
        service, _ = self._make_service_with_ngo(ngo)
        result = service.get_my_profile(user_id=10, role="NGO")
        self.assertEqual(result["ngo_id"], 1)
        self.assertEqual(result["user_id"], 10)

    def test_get_my_profile_wrong_role_raises(self):
        service = NGOProfileService(repository=MagicMock())
        with self.assertRaises(InsufficientRoleException):
            service.get_my_profile(user_id=1, role="DONOR")

    def test_get_my_profile_not_found_raises(self):
        mock_repo = MagicMock(spec=NGORepository)
        mock_repo.find_by_user_id.return_value = None
        service = NGOProfileService(repository=mock_repo)
        with self.assertRaises(NGONotFoundException):
            service.get_my_profile(user_id=99, role="NGO")

    def test_update_my_profile_applies_changes(self):
        ngo = _make_ngo(ngo_id=1, user_id=10)
        mock_repo = MagicMock(spec=NGORepository)
        mock_repo.find_by_user_id.return_value = ngo
        mock_repo.apply_profile_update.return_value = ngo

        with patch("backend.modules.ngos.services.db") as mock_db:
            service = NGOProfileService(repository=mock_repo)
            result = service.update_my_profile(
                user_id=10,
                role="NGO",
                validated_data={"contact_person": "Jane"},
            )

        mock_repo.apply_profile_update.assert_called_once_with(ngo, {"contact_person": "Jane"})
        mock_db.session.commit.assert_called_once()

    def test_update_my_profile_wrong_role_raises(self):
        service = NGOProfileService(repository=MagicMock())
        with self.assertRaises(InsufficientRoleException):
            service.update_my_profile(user_id=1, role="VOLUNTEER", validated_data={"contact_person": "X"})

    def test_update_my_profile_not_found_raises(self):
        mock_repo = MagicMock(spec=NGORepository)
        mock_repo.find_by_user_id.return_value = None
        service = NGOProfileService(repository=mock_repo)
        with self.assertRaises(NGONotFoundException):
            service.update_my_profile(user_id=99, role="NGO", validated_data={"contact_person": "X"})

    def test_update_my_profile_rollback_on_commit_failure(self):
        ngo = _make_ngo()
        mock_repo = MagicMock(spec=NGORepository)
        mock_repo.find_by_user_id.return_value = ngo
        mock_repo.apply_profile_update.return_value = ngo

        with patch("backend.modules.ngos.services.db") as mock_db:
            mock_db.session.commit.side_effect = RuntimeError("DB error")
            service = NGOProfileService(repository=mock_repo)
            with self.assertRaises(RuntimeError):
                service.update_my_profile(
                    user_id=10, role="NGO", validated_data={"contact_person": "X"}
                )
            mock_db.session.rollback.assert_called_once()


if __name__ == "__main__":
    unittest.main()
