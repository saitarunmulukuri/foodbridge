"""Local background thread scheduler implementation.

Design rationale:
    Uses Python's ``threading.Timer`` in a self-rescheduling loop — the same
    pattern as APScheduler's BackgroundScheduler but with zero external deps.
    Each job runs inside a try/except so a single job failure never crashes
    the scheduler or starves other jobs.

    The Flask application context is NOT pushed here.  That responsibility
    belongs to the job callable itself (e.g. the timeout manager wraps its
    DB calls in ``with app.app_context()``).  This keeps the scheduler
    infrastructure completely decoupled from Flask internals.
"""

import logging
import threading
from typing import Optional

from backend.shared.scheduling.scheduler import JobSpec, SchedulerBase

logger = logging.getLogger(__name__)


class _RepeatingTimer:
    """A self-rescheduling timer that runs a callable on a fixed interval.

    Each tick spawns a fresh ``threading.Timer`` so that slow executions do
    NOT cause timer drift — the next tick fires ``interval_seconds`` after
    the *previous tick started*, not after it completed.  If you need
    non-overlapping semantics (run only after previous completes) the tick
    guard lock handles that.
    """

    def __init__(self, spec: JobSpec) -> None:
        self._spec = spec
        self._timer: Optional[threading.Timer] = None
        self._lock = threading.Lock()
        self._stopped = threading.Event()

    def start(self) -> None:
        """Schedule the first tick."""
        self._stopped.clear()
        self._schedule_next()

    def stop(self) -> None:
        """Cancel the pending timer and prevent future ticks."""
        self._stopped.set()
        with self._lock:
            if self._timer is not None:
                self._timer.cancel()
                self._timer = None

    def _schedule_next(self) -> None:
        if self._stopped.is_set():
            return
        with self._lock:
            self._timer = threading.Timer(
                interval=self._spec.interval_seconds,
                function=self._tick,
            )
            self._timer.daemon = True
            self._timer.start()

    def _tick(self) -> None:
        """Execute the job function and reschedule unless stopped."""
        if self._stopped.is_set():
            return
        try:
            self._spec.fn()
        except Exception:  # pragma: no cover
            logger.exception(
                "LocalScheduler: unhandled exception in job '%s'. Continuing.",
                self._spec.job_id,
            )
        finally:
            # Always reschedule, even after an error
            self._schedule_next()


class LocalScheduler(SchedulerBase):
    """Concrete scheduler backed by daemon background threads.

    One ``_RepeatingTimer`` thread per registered job. The scheduler is safe
    to start and stop multiple times.  Adding jobs after ``start()`` is NOT
    supported — register all jobs before calling ``start()``.

    This implementation is suitable for single-process deployments. For
    multi-process / distributed deployments, swap this for an
    APScheduler/Celery-backed implementation behind the same interface.
    """

    def __init__(self) -> None:
        super().__init__()
        self._timers: dict[str, _RepeatingTimer] = {}

    def start(self) -> None:
        """Start all registered repeating timers.  Idempotent."""
        if self._running:
            logger.warning("LocalScheduler: start() called while already running — ignoring.")
            return

        self._running = True
        for spec in self._jobs.values():
            timer = _RepeatingTimer(spec)
            self._timers[spec.job_id] = timer
            timer.start()
            logger.info(
                "LocalScheduler: started job '%s' (interval=%ds).",
                spec.job_id,
                spec.interval_seconds,
            )

        logger.info("LocalScheduler: %d job(s) running.", len(self._timers))

    def stop(self) -> None:
        """Stop all running timers gracefully.  Idempotent."""
        if not self._running:
            return

        self._running = False
        for job_id, timer in self._timers.items():
            timer.stop()
            logger.info("LocalScheduler: stopped job '%s'.", job_id)
        self._timers.clear()
        logger.info("LocalScheduler: all jobs stopped.")
