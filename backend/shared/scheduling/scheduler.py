"""Scheduler abstraction interface for FoodBridge background task processing.

Design rationale:
    The rest of the application never imports a concrete scheduler class directly.
    It programs against SchedulerBase only. This means the underlying strategy
    (local thread, APScheduler, Celery, RQ, etc.) can be swapped without touching
    any business-domain code.

Classes:
    JobSpec: Value object describing a scheduled job's registration parameters.
    SchedulerBase: Abstract base class defining the scheduler contract.
"""

import abc
import logging
from dataclasses import dataclass, field
from typing import Callable, Dict, Optional

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class JobSpec:
    """Value object representing a registered scheduled job.

    Attributes:
        job_id:            Unique job identifier string used for deduplication.
        fn:                Zero-argument callable to execute on each tick.
        interval_seconds:  Interval between executions in seconds.
        description:       Human-readable description for logging and metrics.
    """

    job_id: str
    fn: Callable[[], None]
    interval_seconds: int
    description: str = ""


class SchedulerBase(abc.ABC):
    """Abstract scheduler interface.

    Concrete implementations must override all abstract methods. The
    application factory calls only ``start()`` and ``stop()``.  Individual
    domain modules call ``add_job()`` to register their background sweeps.

    Implementors MUST be thread-safe and MUST NOT raise on repeated
    ``start()`` / ``stop()`` calls (idempotent lifecycle).
    """

    def __init__(self) -> None:
        self._jobs: Dict[str, JobSpec] = {}
        self._running: bool = False

    # ------------------------------------------------------------------
    # Job management
    # ------------------------------------------------------------------

    def add_job(
        self,
        job_id: str,
        fn: Callable[[], None],
        interval_seconds: int,
        description: str = "",
    ) -> None:
        """Register a periodic job with the scheduler.

        Args:
            job_id:           Unique string identifier. Duplicate ids are rejected.
            fn:               Zero-argument callable executed on each interval tick.
            interval_seconds: Repeat interval in seconds (must be > 0).
            description:      Optional human-readable job description.

        Raises:
            ValueError: If ``job_id`` is already registered or ``interval_seconds`` < 1.
        """
        if interval_seconds < 1:
            raise ValueError(f"interval_seconds must be >= 1, got {interval_seconds}")
        if job_id in self._jobs:
            raise ValueError(f"Job '{job_id}' is already registered with the scheduler.")

        spec = JobSpec(
            job_id=job_id,
            fn=fn,
            interval_seconds=interval_seconds,
            description=description,
        )
        self._jobs[job_id] = spec
        logger.debug(
            "Scheduler: registered job '%s' (every %ds) — %s",
            job_id,
            interval_seconds,
            description,
        )

    def remove_job(self, job_id: str) -> None:
        """Unregister a previously added job (idempotent — no-op if not found)."""
        removed = self._jobs.pop(job_id, None)
        if removed:
            logger.debug("Scheduler: removed job '%s'.", job_id)

    @property
    def jobs(self) -> Dict[str, JobSpec]:
        """Read-only view of registered jobs."""
        return dict(self._jobs)

    @property
    def is_running(self) -> bool:
        """True if the scheduler is currently active."""
        return self._running

    # ------------------------------------------------------------------
    # Lifecycle hooks (must be implemented by subclasses)
    # ------------------------------------------------------------------

    @abc.abstractmethod
    def start(self) -> None:
        """Start the scheduler. Must be idempotent (safe to call when already running)."""

    @abc.abstractmethod
    def stop(self) -> None:
        """Stop the scheduler gracefully. Must be idempotent (safe when already stopped)."""
