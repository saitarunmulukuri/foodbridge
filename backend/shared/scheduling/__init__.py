"""FoodBridge Scheduling Abstraction Layer.

Exposes the scheduler interface and the default local thread implementation.
The rest of the application must only import from this package to remain
decoupled from the underlying scheduling strategy.

Usage:
    from backend.shared.scheduling import LocalScheduler

    scheduler = LocalScheduler()
    scheduler.add_job("ngo_timeout", my_fn, interval_seconds=60)
    scheduler.start()
"""

from backend.shared.scheduling.scheduler import SchedulerBase, JobSpec
from backend.shared.scheduling.local_scheduler import LocalScheduler

__all__ = ["SchedulerBase", "JobSpec", "LocalScheduler"]
