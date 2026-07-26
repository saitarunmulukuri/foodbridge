"""Service layer for the Donations domain.

Encapsulates all business rules and transaction management for donation creation.
Authorization is enforced via ``permissions.py`` before any DB access.

Architecture & Design Principles:
    1. Lifecycle Consistency:
       The initial donation status is ``DRAFT``, matching the approved MySQL schema default:
       ``status ENUM('DRAFT', 'SUBMITTED', ...) DEFAULT 'DRAFT'``.
       All layers consistently use ``DRAFT``.

    2. Transaction Ownership:
       Transaction boundaries (commit/rollback) live EXCLUSIVELY in this service.
       Repositories only stage entities into the session.

    3. Security & Identity Resolution:
       ``donor_id`` is NEVER accepted from the client request body.
       It is resolved server-side from the authenticated JWT user_id → Donor lookup.

    4. Audit Trail:
       A ``DonationStatusHistory`` record is staged and committed within the SAME
       transaction to ensure an unbroken audit trail from the initial state.

    5. Centralized Constants:
       Audit messages and change source tags are referenced from ``constants.py``;
       no literal string constants are hardcoded inside this service.
"""

import logging
from typing import Any, Dict, List, Optional

from backend.database import db
from backend.modules.donations.constants import (
    AuditChangeSources,
    AuditMessages,
    DonationDefaults,
)
from backend.modules.donations.exceptions import (
    DonorProfileNotFoundException,
    InvalidDonationWindowException,
)
from backend.modules.donations.models import (
    Donation,
    DonationItem,
    DonationStatusHistory,
)
from backend.modules.donations.permissions import require_donor_role
from backend.modules.donations.repositories import DonationRepository
from backend.shared.constants.enums import (
    DeliveryPreference,
    DonationStatus,
    FoodType,
    ItemCategory,
    QuantityUnit,
)

logger = logging.getLogger(__name__)


class DonationService:
    """Service orchestrating donation creation business logic and transaction safety."""

    def __init__(self, repository: Optional[DonationRepository] = None) -> None:
        self.repository = repository or DonationRepository()

    # ------------------------------------------------------------------
    # Public Interface — Donation Creation (Sprint 2.1)
    # ------------------------------------------------------------------

    def create_donation(
        self,
        user_id: int,
        role: str,
        donation_data: Dict[str, Any],
    ) -> Donation:
        """Orchestrate donation creation within a single atomic database transaction.

        Authorization:
            Requires the caller to have the ``DONOR`` role. Enforced via
            ``permissions.require_donor_role`` before any database queries.

        Donor Resolution:
            ``donor_id`` is resolved from ``user_id`` (JWT sub claim).
            It is never sourced from the client payload.

        Transaction Boundary:
            All writes (Donation, DonationItems, DonationStatusHistory) are
            committed in ONE atomic transaction or rolled back completely on failure.

        Steps:
            1. Enforce DONOR role via permissions layer.
            2. Resolve Donor profile from user_id.
            3. Validate time ordering constraints.
            4. Construct Donation entity with status=DRAFT.
            5. Construct DonationItem entities.
            6. Stage parent Donation and flush to obtain donation_id.
            7. Set FK on items and construct initial status history audit entry.
            8. Stage items and status history via repository methods.
            9. Commit transaction.
            10. Publish domain event hook (post-commit extension point).

        Args:
            user_id: Integer user ID from the JWT ``sub`` claim.
            role: UserRole string from the JWT ``role`` claim.
            donation_data: Validated payload from DonationCreateSchema.load().

        Returns:
            The committed Donation model instance.

        Raises:
            InsufficientRoleException: If caller is not a DONOR.
            DonorProfileNotFoundException: If no donor profile exists for user_id.
            InvalidDonationWindowException: If time ordering constraints are violated.
        """
        # Step 1: Authorization check
        require_donor_role(user_id=user_id, role=role)

        # Step 2: Resolve donor profile from authenticated identity
        donor = self.repository.find_donor_by_user_id(user_id=user_id)
        if donor is None:
            raise DonorProfileNotFoundException(user_id=user_id)

        # Step 3: Defence-in-depth time window validation
        self._validate_time_window(donation_data)

        # Step 4–5: Build unpersisted entities
        donation = self._build_donation(
            donor_id=donor.donor_id,
            user_id=user_id,
            data=donation_data,
        )
        items = self._build_items(donation_data["items"])

        try:
            # Step 6: Stage parent Donation and flush to populate donation.donation_id PK
            self.repository.stage_donation(donation)

            # Step 7: Assign generated donation_id FK to items and build audit entry
            for item in items:
                item.donation_id = donation.donation_id

            status_entry = self._build_initial_status_history(
                donation_id=donation.donation_id,
                changed_by_user_id=user_id,
                change_reason=AuditMessages.DONATION_CREATED_BY_DONOR,
                change_source=AuditChangeSources.DONOR,
            )

            # Step 8: Stage child records using repository abstraction
            self.repository.stage_items(items)
            self.repository.stage_status_history(status_entry)

            # Step 9: Commit single transaction
            db.session.commit()

            logger.info(
                "Donation created successfully: donation_id=%s, donor_id=%s, user_id=%s, "
                "item_count=%d, status=%s",
                donation.donation_id,
                donor.donor_id,
                user_id,
                len(items),
                donation.status.value,
            )
        except Exception:
            db.session.rollback()
            logger.exception(
                "Transaction failed during donation creation: donor_id=%s, user_id=%s",
                donor.donor_id,
                user_id,
            )
            raise

        # Step 10: Trigger post-commit domain event hook
        self._publish_donation_created_event(donation)

        return donation

    # ------------------------------------------------------------------
    # Private Helpers — Validation & Building
    # ------------------------------------------------------------------

    def _validate_time_window(self, data: Dict[str, Any]) -> None:
        """Assert time ordering constraints are satisfied.

        Rule:
            expiry_time must be strictly after available_from (pickup start).

        Args:
            data: Validated donation creation payload.

        Raises:
            InvalidDonationWindowException: If expiry_time <= available_from.
        """
        available_from = data["available_from"]
        expiry_time = data["expiry_time"]

        if expiry_time <= available_from:
            raise InvalidDonationWindowException(
                "expiry_time must be strictly after available_from (pickup start)."
            )

    def _build_donation(
        self,
        donor_id: int,
        user_id: int,
        data: Dict[str, Any],
    ) -> Donation:
        """Construct an unpersisted Donation model instance.

        Initial status is ``DRAFT`` — aligned with the approved database schema ENUM default.

        Args:
            donor_id: Resolved Donor primary key.
            user_id: Authenticated user ID (recorded in created_by_user_id).
            data: Validated payload dictionary.

        Returns:
            Unpersisted Donation instance with status=DRAFT.
        """
        delivery_pref = DeliveryPreference(
            data.get("delivery_preference", DonationDefaults.DEFAULT_DELIVERY_PREFERENCE).upper()
        )
        quantity_unit = QuantityUnit(data["quantity_unit"].upper())

        return Donation(
            donor_id=donor_id,
            created_by_user_id=user_id,
            donation_title=data["donation_title"],
            description=data.get("description"),
            prepared_time=data.get("prepared_time"),
            available_from=data["available_from"],  # Acts as pickup_start
            expiry_time=data["expiry_time"],
            total_quantity=data["total_quantity"],
            quantity_unit=quantity_unit,
            pickup_address=data["pickup_address"],
            pickup_landmark=data.get("pickup_landmark"),
            pickup_city=data["pickup_city"],
            pickup_state=data["pickup_state"],
            pickup_postal_code=data["pickup_postal_code"],
            pickup_latitude=data["pickup_latitude"],
            pickup_longitude=data["pickup_longitude"],
            delivery_preference=delivery_pref,
            special_instructions=data.get("special_instructions"),
            status=DonationStatus.DRAFT,
        )

    def _build_items(self, items_data: List[Dict[str, Any]]) -> List[DonationItem]:
        """Construct a list of unpersisted DonationItem model instances.

        ``donation_id`` FK is set by the caller after staging the parent Donation
        and obtaining its generated primary key.

        Args:
            items_data: Validated list of item dictionaries.

        Returns:
            List of unpersisted DonationItem instances (donation_id not yet set).
        """
        result: List[DonationItem] = []
        for item_data in items_data:
            result.append(
                DonationItem(
                    item_name=item_data["item_name"],
                    category=ItemCategory(item_data["category"].upper()),
                    quantity=item_data["quantity"],
                    unit=QuantityUnit(item_data["unit"].upper()),
                    food_type=FoodType(item_data["food_type"].upper()),
                    contains_allergens=item_data.get("contains_allergens", False),
                    allergen_details=item_data.get("allergen_details"),
                )
            )
        return result

    def _build_initial_status_history(
        self,
        donation_id: int,
        changed_by_user_id: int,
        change_reason: str,
        change_source: str,
    ) -> DonationStatusHistory:
        """Construct the initial status audit history entry for a new donation.

        Records the transition: no prior status → DRAFT.

        Extensibility Note:
            ``change_source`` (e.g. "DONOR", "SYSTEM", "ADMIN", "DECISION_ENGINE")
            prepares the audit model for multi-actor status transition tracking.

        Args:
            donation_id: Generated donation primary key.
            changed_by_user_id: User ID of the actor initiating the change.
            change_reason: Standardized audit message string from AuditMessages.
            change_source: Actor type string from AuditChangeSources.

        Returns:
            Unpersisted DonationStatusHistory instance.
        """
        return DonationStatusHistory(
            donation_id=donation_id,
            previous_status=None,
            new_status=DonationStatus.DRAFT,
            changed_by_user_id=changed_by_user_id,
            change_reason=change_reason,
        )

    # ------------------------------------------------------------------
    # Extension Points — Domain Events
    # ------------------------------------------------------------------

    def _publish_donation_created_event(self, donation: Donation) -> None:
        """Extension point: Publish DonationCreatedEvent after successful transaction commit.

        This method is invoked only after ``db.session.commit()`` succeeds.
        Future subscribers (Decision Engine, Notification System, Analytics)
        can be hooked here without altering transaction boundaries.

        Args:
            donation: Committed Donation model instance.
        """
        logger.debug(
            "EVENT_HOOK: DonationCreatedEvent hook triggered for donation_id=%s",
            donation.donation_id,
        )
