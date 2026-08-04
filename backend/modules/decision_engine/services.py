"""Decision Engine orchestration service.

This module defines the top-level service that orchestrates the full
NGO recommendation pipeline across all 6 stages.

Execution Pipeline:
    ┌─────────────────────────────────────────────────────────────────┐
    │  Step 1 — Load Donation                                         │
    │  candidate_finder.load_donation(donation_id)                    │
    │  → Donation | raise DonationNotFoundException                   │
    ├─────────────────────────────────────────────────────────────────┤
    │  Step 2 — Validate Donation                                     │
    │  validator.validate(donation)                                   │
    │  → validates status, expiry, items, donor                       │
    ├─────────────────────────────────────────────────────────────────┤
    │  Step 3 — Load Candidate NGOs                                   │
    │  candidate_finder.find_candidates(donation)                     │
    │  → List[CandidateNGO]   (DB pre-filter: ACTIVE + VERIFIED)      │
    ├─────────────────────────────────────────────────────────────────┤
    │  Step 4 — Apply Eligibility Filters                             │
    │  eligibility_pipeline.filter_candidates(candidates, ...)        │
    │  → List[EligibleNGO] | raise NoEligibleNGOsException            │
    ├─────────────────────────────────────────────────────────────────┤
    │  Step 5 — Score Eligible NGOs                                   │
    │  scoring_engine.score(eligible_ngos, config)                    │
    │  → List[ScoredNGO]                                              │
    ├─────────────────────────────────────────────────────────────────┤
    │  Step 6 — Rank Scored NGOs                                      │
    │  ranking_engine.rank(scored_ngos, donation_id, top_n)           │
    │  → List[Recommendation]  (sorted by total_score desc)           │
    ├─────────────────────────────────────────────────────────────────┤
    │  Step 7 — Return Result                                         │
    │  DecisionEngineResult(donation_id, recommendations, counts)     │
    └─────────────────────────────────────────────────────────────────┘
"""

import logging
from dataclasses import dataclass
from typing import List, Optional

from datetime import datetime, timezone

from backend.modules.decision_engine.candidate_finder import CandidateNGOFinder
from backend.modules.decision_engine.config import DecisionEngineConfig, default_config
from backend.modules.decision_engine.dto import (
    CandidateNGO,
    DecisionEngineResult,
    EligibleNGO,
    Recommendation,
    ScoredNGO,
)
from backend.modules.decision_engine.exceptions import (
    DonationNotFoundException,
    NoEligibleNGOsException,
)
from backend.modules.decision_engine.execution import DecisionEngineExecutionManager
from backend.modules.decision_engine.filters import EligibilityFilterPipeline
from backend.modules.decision_engine.priority.engine import RankingEngine
from backend.modules.decision_engine.repositories import DecisionEngineRepository
from backend.modules.decision_engine.scoring.engine import ScoringEngine
from backend.modules.decision_engine.validator import DonationValidator
from backend.shared.constants.enums import ExecutionStatus, TriggerReason

logger = logging.getLogger(__name__)


# -----------------------------------------------------------------------
# Orchestration Service
# -----------------------------------------------------------------------


class DecisionEngineService:
    """Top-level orchestration service for the NGO recommendation pipeline."""

    def __init__(
        self,
        repository: Optional[DecisionEngineRepository] = None,
        candidate_finder: Optional[CandidateNGOFinder] = None,
        validator: Optional[DonationValidator] = None,
        eligibility_pipeline: Optional[EligibilityFilterPipeline] = None,
        scoring_engine: Optional[ScoringEngine] = None,
        ranking_engine: Optional[RankingEngine] = None,
        execution_manager: Optional[DecisionEngineExecutionManager] = None,
        config: Optional[DecisionEngineConfig] = None,
    ) -> None:
        self.repository: DecisionEngineRepository = repository or DecisionEngineRepository()
        self.config: DecisionEngineConfig = config or default_config
        self.candidate_finder: CandidateNGOFinder = (
            candidate_finder or CandidateNGOFinder(repository=self.repository)
        )
        self.validator: DonationValidator = validator or DonationValidator()
        self.eligibility_pipeline: EligibilityFilterPipeline = (
            eligibility_pipeline or EligibilityFilterPipeline()
        )
        self.scoring_engine: ScoringEngine = scoring_engine or ScoringEngine()
        self.ranking_engine: RankingEngine = ranking_engine or RankingEngine()
        self.execution_manager: DecisionEngineExecutionManager = (
            execution_manager or DecisionEngineExecutionManager()
        )

    def run(
        self,
        donation_id: int,
        top_n: Optional[int] = None,
        persist: bool = False,
        trigger_reason: TriggerReason = TriggerReason.NEW_DONATION,
    ) -> DecisionEngineResult:
        """Execute the full NGO recommendation pipeline for a donation.

        Args:
            donation_id: The primary key of the donation to match.
            top_n: Optional limit on the number of recommended NGOs to return.
            persist: If True, persist audit logs (DecisionEngineRun & RecommendationCycle)
                     and dispatch NGORequest to rank 1 NGO.
            trigger_reason: Event trigger reason for the recommendation cycle.

        Returns:
            DecisionEngineResult with ranked recommendations.

        Raises:
            DonationNotFoundException: If donation_id is not found in database.
            DonationValidationError (or subclasses): If donation fails pre-conditions.
            NoEligibleNGOsException: If no candidate NGOs pass eligibility rules.
        """
        logger.info("DecisionEngineService starting execution for donation_id=%s", donation_id)
        started_at = datetime.now(timezone.utc)

        # Step 1: Load Donation
        donation = self._step1_load_donation(donation_id)

        # Step 2: Validate Donation
        self._step2_validate_donation(donation)

        # Step 3: Find Candidates
        candidates = self._step3_find_candidates(donation)
        if not candidates:
            logger.warning("No candidate NGOs found in DB for donation_id=%s", donation_id)
            completed_at = datetime.now(timezone.utc)
            if persist:
                self.execution_manager.persist_failure(
                    donation_id=donation_id,
                    started_at=started_at,
                    completed_at=completed_at,
                    execution_status=ExecutionStatus.NO_CANDIDATES,
                    failure_reason="No candidate NGOs matched active DB constraints.",
                )
            raise NoEligibleNGOsException(donation_id)

        # Step 4: Filter Candidates
        eligible_ngos = self._step4_apply_eligibility_filters(candidates, donation)
        if not eligible_ngos:
            logger.warning("No candidate NGOs passed eligibility filters for donation_id=%s", donation_id)
            completed_at = datetime.now(timezone.utc)
            if persist:
                self.execution_manager.persist_failure(
                    donation_id=donation_id,
                    started_at=started_at,
                    completed_at=completed_at,
                    execution_status=ExecutionStatus.NO_CANDIDATES,
                    failure_reason="All candidate NGOs were disqualified by eligibility pipeline rules.",
                )
            raise NoEligibleNGOsException(donation_id)

        # Step 5: Score Eligible NGOs
        scored_ngos = self._step5_score(eligible_ngos)

        # Step 6: Rank Scored NGOs
        recommendations = self._step6_rank(scored_ngos, donation_id, top_n=top_n)
        completed_at = datetime.now(timezone.utc)

        result = DecisionEngineResult(
            donation_id=donation_id,
            recommendations=recommendations,
            total_candidates=len(candidates),
            total_eligible=len(eligible_ngos),
            total_scored=len(scored_ngos),
            algorithm_version="1.0",
        )

        if persist:
            self.execution_manager.persist_and_dispatch(
                result=result,
                started_at=started_at,
                completed_at=completed_at,
                trigger_reason=trigger_reason,
            )

        logger.info(
            "DecisionEngineService finished execution for donation_id=%s: %d recommendations produced",
            donation_id,
            len(recommendations),
        )
        return result


    # ------------------------------------------------------------------
    # Pipeline Stage Steps
    # ------------------------------------------------------------------

    def _step1_load_donation(self, donation_id: int):
        """Step 1: Load donation from the database."""
        donation = self.candidate_finder.load_donation(donation_id)
        if donation is None:
            raise DonationNotFoundException(donation_id)
        return donation

    def _step2_validate_donation(self, donation) -> None:
        """Step 2: Validate donation pre-conditions for matching."""
        self.validator.validate(donation)

    def _step3_find_candidates(self, donation) -> List[CandidateNGO]:
        """Step 3: Load pre-qualified candidate NGOs from the database."""
        return self.candidate_finder.find_candidates(donation)

    def _step4_apply_eligibility_filters(
        self,
        candidates: List[CandidateNGO],
        donation,
    ) -> List[EligibleNGO]:
        """Step 4: Apply business-layer eligibility rules to candidate DTOs."""
        return self.eligibility_pipeline.filter_candidates(
            candidates=candidates,
            donation=donation,
            config=self.config,
        )

    def _step5_score(
        self,
        eligible_ngos: List[EligibleNGO],
    ) -> List[ScoredNGO]:
        """Step 5: Compute multi-criteria recommendation scores."""
        return self.scoring_engine.score(
            eligible_ngos=eligible_ngos,
            config=self.config,
        )

    def _step6_rank(
        self,
        scored_ngos: List[ScoredNGO],
        donation_id: int,
        top_n: Optional[int] = None,
    ) -> List[Recommendation]:
        """Step 6: Rank scored NGOs and produce final Recommendation DTOs."""
        return self.ranking_engine.rank(
            scored_ngos=scored_ngos,
            donation_id=donation_id,
            top_n=top_n,
            algorithm_version="1.0",
        )
