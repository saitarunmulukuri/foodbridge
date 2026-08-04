"""Repository abstraction for Volunteer module database operations."""

import logging
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from backend.database import db
from backend.modules.volunteers.models import AssignmentHistory, Volunteer, VolunteerAssignment
from backend.shared.constants.enums import AssignmentStatus

logger = logging.getLogger(__name__)


class VolunteerRepository:
    """Repository handling database read/write operations for volunteers and assignments."""

    def __init__(self, session: Optional[Session] = None) -> None:
        self._session: Session = session or db.session

    def find_volunteer_by_user_id(self, user_id: int) -> Optional[Volunteer]:
        """Find a Volunteer entity by the associated user_id."""
        stmt = (
            select(Volunteer)
            .where(Volunteer.user_id == user_id)
            .options(joinedload(Volunteer.user))
        )
        return self._session.execute(stmt).scalars().first()

    def find_volunteer_by_id(self, volunteer_id: int) -> Optional[Volunteer]:
        """Find a Volunteer entity by volunteer_id primary key."""
        stmt = (
            select(Volunteer)
            .where(Volunteer.volunteer_id == volunteer_id)
            .options(joinedload(Volunteer.user))
        )
        return self._session.execute(stmt).scalars().first()

    def find_assignment_by_id(self, assignment_id: int) -> Optional[VolunteerAssignment]:
        """Find a VolunteerAssignment by primary key with relationships eager-loaded."""
        stmt = (
            select(VolunteerAssignment)
            .where(VolunteerAssignment.assignment_id == assignment_id)
            .options(
                joinedload(VolunteerAssignment.volunteer),
                joinedload(VolunteerAssignment.ngo_request),
            )
        )
        return self._session.execute(stmt).unique().scalars().first()

    def find_assignments_for_volunteer(
        self, volunteer_id: int
    ) -> List[VolunteerAssignment]:
        """Find all assignments for a volunteer ordered by creation date desc."""
        stmt = (
            select(VolunteerAssignment)
            .where(VolunteerAssignment.volunteer_id == volunteer_id)
            .options(
                joinedload(VolunteerAssignment.ngo_request),
            )
            .order_by(VolunteerAssignment.created_at.desc())
        )
        return list(self._session.execute(stmt).unique().scalars().all())

    def find_pending_assignments_for_request(
        self, ngo_request_id: int, exclude_assignment_id: Optional[int] = None
    ) -> List[VolunteerAssignment]:
        """Find all PENDING assignments for an NGO request."""
        stmt = select(VolunteerAssignment).where(
            VolunteerAssignment.ngo_request_id == ngo_request_id,
            VolunteerAssignment.status == AssignmentStatus.PENDING,
        )
        if exclude_assignment_id:
            stmt = stmt.where(VolunteerAssignment.assignment_id != exclude_assignment_id)
        return list(self._session.execute(stmt).scalars().all())

    def update_assignment_status(
        self,
        assignment: VolunteerAssignment,
        new_status: AssignmentStatus,
        changed_by_user_id: Optional[int] = None,
        reason: Optional[str] = None,
    ) -> None:
        """Update assignment status and append to AssignmentHistory audit log."""
        prev_status = assignment.status
        assignment.status = new_status

        history = AssignmentHistory(
            assignment_id=assignment.assignment_id,
            previous_status=prev_status,
            new_status=new_status,
            changed_by_user_id=changed_by_user_id,
            change_reason=reason,
        )
        self._session.add(history)
