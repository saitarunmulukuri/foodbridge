"""Seed and Reset Script for FoodBridge Demo Accounts.

Usage:
    python backend/scripts/seed_demo_data.py
    python backend/scripts/seed_demo_data.py --reset

Configures three deterministic demo personas:
    1. Food Donor:        Dave's Kitchen (e2e_donor@foodbridge.org)
    2. NGO Partner:       Community Meals NGO (e2e_ngo@foodbridge.org)
    3. Volunteer Driver:  Rapid Dispatch Driver (e2e_vol@foodbridge.org)

Shared password:
    Secure@12345

Safety guarantee:
    Only creates/modifies the three designated demo accounts and their test records.
    Never deletes or alters normal production/registered user data.
"""

import argparse
import logging
import os
import sys
from datetime import datetime, timezone
from decimal import Decimal

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app import create_app
from backend.database import db
from backend.modules.authentication.models import User
from backend.modules.donations.models import (
    DecisionEngineRun,
    Donation,
    DonationItem,
    DonationStatusHistory,
    RecommendationCycle,
)
from backend.modules.donors.models import Donor
from backend.modules.ngos.models import (
    NGO,
    NGODailyCapacity,
    NGODateCapacity,
    NGORequest,
    NGORequestHistory,
)
from backend.modules.notifications.models import Notification
from backend.modules.volunteers.models import (
    AssignmentHistory,
    Volunteer,
    VolunteerAssignment,
)
from backend.shared.constants.enums import (
    AccountStatus,
    CapacityStatus,
    DayOfWeek,
    OperationalStatus,
    UserRole,
    VehicleType,
    VerificationStatus,
)
from backend.shared.security import hash_password

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_demo_data")

DEMO_DONOR_EMAIL = "e2e_donor@foodbridge.org"
DEMO_NGO_EMAIL = "e2e_ngo@foodbridge.org"
DEMO_VOL_EMAIL = "e2e_vol@foodbridge.org"
DEMO_PASSWORD = "Secure@12345"


def seed_demo_environment(app=None, reset: bool = True) -> None:
    """Initialize or reset the 3 FoodBridge demo personas."""
    if app is None:
        app = create_app()

    with app.app_context():
        db.create_all()

        pw_hash = hash_password(DEMO_PASSWORD)

        # -------------------------------------------------------------------
        # 1. Food Donor: Dave's Kitchen
        # -------------------------------------------------------------------
        donor_user = db.session.query(User).filter_by(email=DEMO_DONOR_EMAIL).first()
        if not donor_user:
            donor_user = User(
                email=DEMO_DONOR_EMAIL,
                password_hash=pw_hash,
                role=UserRole.DONOR,
                account_status=AccountStatus.ACTIVE,
            )
            db.session.add(donor_user)
            db.session.flush()
        else:
            donor_user.password_hash = pw_hash
            donor_user.account_status = AccountStatus.ACTIVE

        donor_profile = db.session.query(Donor).filter_by(user_id=donor_user.user_id).first()
        if not donor_profile:
            donor_profile = Donor(
                user_id=donor_user.user_id,
                organisation_name="Dave's Kitchen",
                contact_person="Dave Miller",
                phone="+91 98765 43210",
                address="Banjara Hills, Road No. 12, Hyderabad, Telangana",
                latitude=Decimal("17.412600"),
                longitude=Decimal("78.407100"),
                verification_status=VerificationStatus.VERIFIED,
                is_active=True,
            )
            db.session.add(donor_profile)
        else:
            donor_profile.organisation_name = "Dave's Kitchen"
            donor_profile.contact_person = "Dave Miller"
            donor_profile.phone = "+91 98765 43210"
            donor_profile.address = "Banjara Hills, Road No. 12, Hyderabad, Telangana"
            donor_profile.latitude = Decimal("17.412600")
            donor_profile.longitude = Decimal("78.407100")
            donor_profile.verification_status = VerificationStatus.VERIFIED
            donor_profile.is_active = True

        # -------------------------------------------------------------------
        # 2. NGO Partner: Community Meals NGO
        # -------------------------------------------------------------------
        ngo_user = db.session.query(User).filter_by(email=DEMO_NGO_EMAIL).first()
        if not ngo_user:
            ngo_user = User(
                email=DEMO_NGO_EMAIL,
                password_hash=pw_hash,
                role=UserRole.NGO,
                account_status=AccountStatus.ACTIVE,
            )
            db.session.add(ngo_user)
            db.session.flush()
        else:
            ngo_user.password_hash = pw_hash
            ngo_user.account_status = AccountStatus.ACTIVE

        ngo_profile = db.session.query(NGO).filter_by(user_id=ngo_user.user_id).first()
        if not ngo_profile:
            ngo_profile = NGO(
                user_id=ngo_user.user_id,
                organisation_name="Community Meals NGO",
                registration_number="REG-CM-HYD-001",
                contact_person="Anita Rao",
                phone="+91 98765 43211",
                address="Jubilee Hills, Road No. 36, Hyderabad, Telangana",
                city="Hyderabad",
                state="Telangana",
                country="India",
                postal_code="500033",
                description="Community food security network serving Hyderabad urban clusters.",
                latitude=Decimal("17.420000"),
                longitude=Decimal("78.410000"),
                service_radius_km=15,
                verification_status=VerificationStatus.VERIFIED,
                is_active=True,
            )
            db.session.add(ngo_profile)
            db.session.flush()
        else:
            ngo_profile.organisation_name = "Community Meals NGO"
            ngo_profile.registration_number = "REG-CM-HYD-001"
            ngo_profile.contact_person = "Anita Rao"
            ngo_profile.phone = "+91 98765 43211"
            ngo_profile.address = "Jubilee Hills, Road No. 36, Hyderabad, Telangana"
            ngo_profile.city = "Hyderabad"
            ngo_profile.state = "Telangana"
            ngo_profile.country = "India"
            ngo_profile.postal_code = "500033"
            ngo_profile.description = "Community food security network serving Hyderabad urban clusters."
            ngo_profile.latitude = Decimal("17.420000")
            ngo_profile.longitude = Decimal("78.410000")
            ngo_profile.service_radius_km=15
            ngo_profile.verification_status = VerificationStatus.VERIFIED
            ngo_profile.is_active = True

        # Configure NGO capacity (200 meals total, 0 allocated, 200 remaining)
        today_date = datetime.now(timezone.utc).date()
        date_cap = (
            db.session.query(NGODateCapacity)
            .filter_by(ngo_id=ngo_profile.ngo_id, date=today_date)
            .first()
        )
        if not date_cap:
            date_cap = NGODateCapacity(
                ngo_id=ngo_profile.ngo_id,
                date=today_date,
                max_meals=200,
                allocated_meals=0,
            )
            db.session.add(date_cap)
        else:
            date_cap.max_meals = 200
            date_cap.allocated_meals = 0

        for dow in DayOfWeek:
            daily_cap = (
                db.session.query(NGODailyCapacity)
                .filter_by(ngo_id=ngo_profile.ngo_id, day_of_week=dow)
                .first()
            )
            if not daily_cap:
                daily_cap = NGODailyCapacity(
                    ngo_id=ngo_profile.ngo_id,
                    day_of_week=dow,
                    max_meals=200,
                    remaining_capacity=200,
                    status=CapacityStatus.ACTIVE,
                )
                db.session.add(daily_cap)
            else:
                daily_cap.max_meals = 200
                daily_cap.remaining_capacity = 200
                daily_cap.status = CapacityStatus.ACTIVE

        # -------------------------------------------------------------------
        # 3. Volunteer Driver: Rapid Dispatch Driver
        # -------------------------------------------------------------------
        vol_user = db.session.query(User).filter_by(email=DEMO_VOL_EMAIL).first()
        if not vol_user:
            vol_user = User(
                email=DEMO_VOL_EMAIL,
                password_hash=pw_hash,
                role=UserRole.VOLUNTEER,
                account_status=AccountStatus.ACTIVE,
            )
            db.session.add(vol_user)
            db.session.flush()
        else:
            vol_user.password_hash = pw_hash
            vol_user.account_status = AccountStatus.ACTIVE

        vol_profile = db.session.query(Volunteer).filter_by(user_id=vol_user.user_id).first()
        if not vol_profile:
            vol_profile = Volunteer(
                user_id=vol_user.user_id,
                phone="+91 98765 43212",
                vehicle_type=VehicleType.VAN,
                latitude=Decimal("17.415000"),
                longitude=Decimal("78.408000"),
                operational_status=OperationalStatus.AVAILABLE,
                verification_status=VerificationStatus.VERIFIED,
                is_active=True,
            )
            db.session.add(vol_profile)
        else:
            vol_profile.phone = "+91 98765 43212"
            vol_profile.vehicle_type = VehicleType.VAN
            vol_profile.latitude = Decimal("17.415000")
            vol_profile.longitude = Decimal("78.408000")
            vol_profile.operational_status = OperationalStatus.AVAILABLE
            vol_profile.verification_status = VerificationStatus.VERIFIED
            vol_profile.is_active = True

        # -------------------------------------------------------------------
        # If reset=True: Clean up old demo donations & assignments
        # -------------------------------------------------------------------
        if reset and donor_profile.donor_id:
            old_donations = (
                db.session.query(Donation)
                .filter_by(donor_id=donor_profile.donor_id)
                .all()
            )
            for d in old_donations:
                # Cascade will clean up items, runs, cycles, requests, assignments
                db.session.delete(d)
            logger.info("Reset cleaned up %d previous demo donations.", len(old_donations))

        db.session.commit()

        logger.info("=" * 60)
        logger.info("FoodBridge Demo Environment Successfully Initialized / Reset")
        logger.info("=" * 60)
        logger.info("1. Donor:     %s (Dave's Kitchen) -> Password: %s", DEMO_DONOR_EMAIL, DEMO_PASSWORD)
        logger.info("2. NGO:       %s (Community Meals NGO) [Cap: 200 meals] -> Password: %s", DEMO_NGO_EMAIL, DEMO_PASSWORD)
        logger.info("3. Volunteer: %s (Rapid Dispatch Driver) [VAN, Available] -> Password: %s", DEMO_VOL_EMAIL, DEMO_PASSWORD)
        logger.info("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed or reset FoodBridge demo accounts.")
    parser.add_argument(
        "--reset",
        action="store_true",
        default=True,
        help="Reset demo accounts and remove previous test transactions (default: True).",
    )
    args = parser.parse_args()
    seed_demo_environment(reset=args.reset)
