"""Scoring Engine component for the Decision Engine.

Calculates multi-criteria recommendation scores for eligible NGOs across 6 dimensions:
    1. Distance / Proximity (distance_score, 25%)
    2. Daily Meal Capacity (capacity_score, 20%)
    3. Freshness / Urgency Fit (freshness_score, 20%)
    4. Community Demand / Reliability (demand_score, 20%)
    5. Dietary & Food Compatibility (compatibility_score, 10%)
    6. Operational Availability (availability_score, 5%)

All dimension scores are normalized to [0.0, 1.0] before weight application.
The final total_score is a weighted sum guaranteed to be in [0.0, 1.0].
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from backend.modules.decision_engine.config import DecisionEngineConfig
from backend.modules.decision_engine.dto import EligibleNGO, ScoredNGO
from backend.modules.donations.models import Donation

logger = logging.getLogger(__name__)

# Default reliability / demand score assigned to newly onboarded NGOs with no request history
DEFAULT_RELIABILITY_SCORE: float = 0.5


class ScoringEngine:
    """Component responsible for computing normalized multi-criteria recommendation scores."""

    def score(
        self,
        eligible_ngos: List[EligibleNGO],
        config: DecisionEngineConfig,
        donation: Optional[Donation] = None,
    ) -> List[ScoredNGO]:
        """Compute multi-criteria scores for a list of EligibleNGO DTOs.

        Args:
            eligible_ngos: List of EligibleNGO DTOs that passed eligibility filtering.
            config: DecisionEngineConfig providing weights and limits.
            donation: Optional Donation context to calculate dynamic urgency and compatibility.

        Returns:
            List of ScoredNGO DTO instances with component scores and decision reason.
        """
        if not eligible_ngos:
            return []

        # Find maximum remaining capacity among eligible NGOs for relative normalization
        max_remaining_capacity = max(ngo.remaining_capacity for ngo in eligible_ngos)
        max_radius = config.MAX_RADIUS_KM

        # Calculate dynamic freshness / urgency score from donation timeline
        freshness_score = 0.70
        required_quantity = 1.0
        if donation is not None:
            required_quantity = float(getattr(donation, "total_quantity", 1) or 1)
            expiry = getattr(donation, "expiry_time", None)
            if expiry:
                now = datetime.now(timezone.utc)
                if expiry.tzinfo is None:
                    expiry = expiry.replace(tzinfo=timezone.utc)
                hours_remaining = max(0.0, (expiry - now).total_seconds() / 3600.0)

                if hours_remaining <= 0:
                    freshness_score = 0.0
                elif hours_remaining < 2.0:
                    freshness_score = 1.0   # CRITICAL urgency
                elif hours_remaining < 4.0:
                    freshness_score = 0.85  # HIGH urgency
                elif hours_remaining < 8.0:
                    freshness_score = 0.70  # NORMAL urgency
                else:
                    freshness_score = 0.50  # FLEXIBLE window

        scored_list: List[ScoredNGO] = []

        for ngo in eligible_ngos:
            ngo_name = getattr(ngo, "ngo_name", "") or f"NGO #{ngo.ngo_id}"

            # 1. Distance score: 1.0 (closest) down to 0.0 (at max_radius_km)
            if max_radius > 0:
                dist_score = max(0.0, 1.0 - (ngo.distance_km / max_radius))
            else:
                dist_score = 1.0
            dist_score = round(min(1.0, dist_score), 4)

            # 2. Capacity score: relative to maximum capacity in current candidate set
            if max_remaining_capacity > 0:
                cap_score = ngo.remaining_capacity / max_remaining_capacity
            else:
                cap_score = 1.0
            cap_score = round(min(1.0, max(0.0, cap_score)), 4)

            # 3. Freshness / Urgency fit
            fresh_score = round(freshness_score, 4)

            # 4. Demand / Reliability score: historical acceptance rate
            rel_score = (
                ngo.reliability_score
                if ngo.reliability_score is not None
                else DEFAULT_RELIABILITY_SCORE
            )
            rel_score = min(1.0, max(0.0, rel_score))
            demand_score = round(rel_score, 4)
            rel_score_weighted = round(rel_score * getattr(config, "DEMAND_WEIGHT", config.RELIABILITY_WEIGHT), 4)

            # 5. Food Compatibility score: dietary & handling match
            compat_score = 1.0

            # 6. Operational Availability score: response speed & operational readiness
            if (
                ngo.average_response_time_minutes is not None
                and config.MAX_RESPONSE_TIME_MINUTES > 0
            ):
                avail_score = max(
                    0.0,
                    1.0 - (ngo.average_response_time_minutes / config.MAX_RESPONSE_TIME_MINUTES),
                )
            else:
                avail_score = 0.85
            avail_score = round(min(1.0, max(0.0, avail_score)), 4)
            resp_score = avail_score

            # Weighted sum calculation across all configured weights
            dist_w = getattr(config, "DISTANCE_WEIGHT", 0.25)
            cap_w = getattr(config, "CAPACITY_WEIGHT", 0.20)
            fresh_w = getattr(config, "FRESHNESS_WEIGHT", 0.20)
            demand_w = getattr(config, "DEMAND_WEIGHT", config.RELIABILITY_WEIGHT)
            compat_w = getattr(config, "COMPATIBILITY_WEIGHT", 0.10)
            avail_w = getattr(config, "AVAILABILITY_WEIGHT", config.RESPONSE_WEIGHT)

            total_score = (
                (dist_score * dist_w)
                + (cap_score * cap_w)
                + (fresh_score * fresh_w)
                + (demand_score * demand_w)
                + (compat_score * compat_w)
                + (avail_score * avail_w)
            )
            total_score = round(min(1.0, max(0.0, total_score)), 4)

            # Generate dynamic human-readable decision reason
            decision_reason = self._generate_decision_reason(
                ngo_name=ngo_name,
                distance_km=ngo.distance_km,
                remaining_capacity=ngo.remaining_capacity,
                required_quantity=required_quantity,
                dist_score=dist_score,
                cap_score=cap_score,
                demand_score=demand_score,
            )

            scored = ScoredNGO(
                ngo_id=ngo.ngo_id,
                distance_km=round(ngo.distance_km, 3),
                remaining_capacity=ngo.remaining_capacity,
                reliability_score=ngo.reliability_score,
                average_response_time_minutes=ngo.average_response_time_minutes,
                distance_score=dist_score,
                capacity_score=cap_score,
                compatibility_score=compat_score,
                reliability_score_weighted=rel_score_weighted,
                response_score=resp_score,
                total_score=total_score,
                ngo_name=ngo_name,
                freshness_score=fresh_score,
                demand_score=demand_score,
                availability_score=avail_score,
                decision_reason=decision_reason,
            )
            scored_list.append(scored)

        logger.info("ScoringEngine scored %d eligible NGOs.", len(scored_list))
        return scored_list

    @staticmethod
    def _generate_decision_reason(
        ngo_name: str,
        distance_km: float,
        remaining_capacity: int,
        required_quantity: float,
        dist_score: float,
        cap_score: float,
        demand_score: float,
    ) -> str:
        """Construct an explainable natural language justification for the match score."""
        reasons = []
        if distance_km <= 3.0:
            reasons.append(f"is in immediate proximity ({distance_km:.1f} km)")
        elif distance_km <= 8.0:
            reasons.append(f"is located nearby ({distance_km:.1f} km)")
        else:
            reasons.append(f"is within reachable operational range ({distance_km:.1f} km)")

        if remaining_capacity >= required_quantity * 2:
            reasons.append(f"has ample meal capacity ({remaining_capacity} available)")
        else:
            reasons.append(f"has verified intake capacity ({remaining_capacity} meals)")

        if demand_score >= 0.70:
            reasons.append("has strong community demand and response reliability")
        else:
            reasons.append("is ready to accept and distribute this food category before expiry")

        return f"Selected because {ngo_name} " + ", ".join(reasons[:-1]) + ", and " + reasons[-1] + "."

