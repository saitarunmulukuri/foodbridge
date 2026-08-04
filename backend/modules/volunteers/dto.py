"""Volunteer Logistics Internal Data Transfer Objects (DTOs)."""

from dataclasses import dataclass
from typing import Optional

from backend.shared.constants.enums import VehicleType


@dataclass
class CandidateVolunteer:
    """Internal DTO representing a pre-qualified available volunteer.

    Fields:
        volunteer_id: Integer primary key of the Volunteer entity.
        latitude: Volunteer's current latitude in decimal degrees.
        longitude: Volunteer's current longitude in decimal degrees.
        vehicle_type: VehicleType enum value.
        distance_km: Computed Haversine distance to pickup location in km.
    """

    volunteer_id: int
    latitude: float
    longitude: float
    vehicle_type: VehicleType
    distance_km: float


@dataclass
class ScoredVolunteer:
    """Internal DTO representing a candidate volunteer with calculated assignment scores.

    Fields:
        volunteer_id: Integer primary key.
        distance_km: Distance to pickup location in km.
        vehicle_type: VehicleType enum.
        proximity_score: Normalized proximity score in [0.0, 1.0].
        suitability_score: Normalized vehicle suitability score in [0.0, 1.0].
        total_score: Weighted total recommendation score in [0.0, 100.0].
    """

    volunteer_id: int
    distance_km: float
    vehicle_type: VehicleType
    proximity_score: float = 0.0
    suitability_score: float = 0.0
    total_score: float = 0.0
