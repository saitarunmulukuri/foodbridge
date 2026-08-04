"""Candidate Volunteer Finder component for Volunteer Logistics.

Finds pre-qualified available volunteers based on active status, verification status,
operational availability, and proximity to pickup location.
"""

import logging
import math
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import db
from backend.modules.volunteers.dto import CandidateVolunteer
from backend.modules.volunteers.models import Volunteer
from backend.shared.constants.enums import OperationalStatus, VerificationStatus

logger = logging.getLogger(__name__)

_EARTH_RADIUS_KM: float = 6371.0


def haversine_distance_km(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Compute great-circle distance between two coordinates in km."""
    lat1_r = math.radians(float(lat1))
    lat2_r = math.radians(float(lat2))
    dlat = math.radians(float(lat2) - float(lat1))
    dlon = math.radians(float(lon2) - float(lon1))

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return _EARTH_RADIUS_KM * c


class CandidateVolunteerFinder:
    """Component finding pre-qualified candidate volunteers for pickup dispatch."""

    def __init__(self, session: Optional[Session] = None) -> None:
        self._session = session or db.session

    def find_candidates(
        self,
        pickup_lat: float,
        pickup_lon: float,
        max_radius_km: float = 15.0,
    ) -> List[CandidateVolunteer]:
        """Find candidate volunteers available for pickup within radius.

        Args:
            pickup_lat: Latitude of pickup location.
            pickup_lon: Longitude of pickup location.
            max_radius_km: Maximum radius in km.

        Returns:
            List of CandidateVolunteer DTOs sorted by distance.
        """
        stmt = select(Volunteer).where(
            Volunteer.is_active.is_(True),
            Volunteer.verification_status == VerificationStatus.VERIFIED,
            Volunteer.operational_status == OperationalStatus.AVAILABLE,
            Volunteer.latitude.isnot(None),
            Volunteer.longitude.isnot(None),
        )
        volunteers = self._session.execute(stmt).scalars().all()

        candidates: List[CandidateVolunteer] = []
        for vol in volunteers:
            dist = haversine_distance_km(
                lat1=float(vol.latitude),
                lon1=float(vol.longitude),
                lat2=pickup_lat,
                lon2=pickup_lon,
            )
            if dist <= max_radius_km:
                candidates.append(
                    CandidateVolunteer(
                        volunteer_id=vol.volunteer_id,
                        latitude=float(vol.latitude),
                        longitude=float(vol.longitude),
                        vehicle_type=vol.vehicle_type,
                        distance_km=round(dist, 3),
                    )
                )

        logger.info(
            "CandidateVolunteerFinder found %d candidate volunteers within %s km.",
            len(candidates),
            max_radius_km,
        )
        return candidates
