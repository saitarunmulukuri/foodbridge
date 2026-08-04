# FoodBridge System Architecture

FoodBridge is designed as a **Modular Monolith** in Python (Flask) with clear domain boundaries, repository pattern persistence, and an intelligent sub-system Decision Engine.

## Architecture Layers

```
+-------------------------------------------------------+
|                    Presentation                       |
|           Flask Blueprints & Route Handlers           |
+-------------------------------------------------------+
                           |
+-------------------------------------------------------+
|                    Application                        |
|            Marshmallow Schemas & Validators           |
+-------------------------------------------------------+
                           |
+-------------------------------------------------------+
|                      Domain                           |
|       Services (Business Rules & State Machine)       |
+-------------------------------------------------------+
                           |
+-------------------------------------------------------+
|                    Sub-System                         |
|     Decision Engine (Filters, Scorer, Ranker)         |
+-------------------------------------------------------+
                           |
+-------------------------------------------------------+
|                   Infrastructure                      |
|         Repositories (SQLAlchemy 2.x ORM)             |
+-------------------------------------------------------+
                           |
+-------------------------------------------------------+
|                     Database                          |
|             MySQL / PostgreSQL / SQLite               |
+-------------------------------------------------------+
```

## Domain Modules

1. **`authentication`**: Account registration, credential verification, password hashing, JWT token lifecycle.
2. **`donors`**: Donor profiles (hotels, restaurants, supermarkets).
3. **`donations`**: Donation lifecycle (DRAFT → SUBMITTED → PENDING_NGO → PICKUP_IN_PROGRESS → COMPLETED).
4. **`ngos`**: NGO profiles, date-based meal intake capacity management.
5. **`donation_requests`**: NGO request state machine, accept/decline flows, competing request auto-cancellation.
6. **`decision_engine`**: Pre-qualification candidate finder, 4-stage eligibility pipeline, multi-criteria scoring engine, priority ranker, execution engine.
7. **`volunteers`**: Volunteer profiles, candidate finder, proximity/vehicle scoring engine, assignment state machine, delivery completion.
8. **`notifications`**: System event notification trail.
9. **`shared/scheduling`**: Threaded background scheduler for automated timeout detection & fallback dispatch.

## State Machines

### Donation State Machine
`DRAFT` → `SUBMITTED` → `PENDING_NGO` → `NGO_ACCEPTED` / `PICKUP_IN_PROGRESS` → `COMPLETED`
*(Terminal cancellation / expiry states: `EXPIRED`, `CANCELLED`)*

### NGO Request State Machine
`PENDING` → `ACCEPTED` / `REJECTED` / `TIMED_OUT` / `AUTO_CANCELLED`

### Volunteer Assignment State Machine
`PENDING` → `ACCEPTED` / `REJECTED` / `TIMED_OUT` / `AUTO_CANCELLED`
