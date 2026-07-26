# FoodBridge – Architecture & Engineering Standards Guide

## 1. Overview

FoodBridge is designed around **Clean Architecture**, **SOLID principles**, and the **Application Factory pattern**. The architecture ensures clear separation of concerns, strict decoupling of domain models from database transaction logic, and full auditability of algorithm executions.

---

## 2. Layer Responsibilities & Data Flow

```
HTTP Client / Frontend (React + Vite)
            │
            ▼
Presentation Layer (Flask Blueprints & Controllers / Routes)
            │
            ▼
Service Layer (Business Logic & Transactions) ◄─── Marshmallow Schemas (Validation/DTO)
            │
            ▼
Repository Layer (Database Query Abstraction)
            │
            ▼
Data Layer (SQLAlchemy 2.x ORM Models)
            │
            ▼
Database (MySQL 8.0+ / InnoDB)
```

### Layer Breakdown:

1. **Presentation Layer (`routes.py`, `controller.py`):**
   - Handles HTTP requests/responses, route registration (`/api/v1/...`), and status code formatting.
   - Delegates business execution directly to the Service Layer.
   - Models are **NEVER** accessed directly from routes.

2. **Service Layer (`service.py`):**
   - Encapsulates all application business rules, domain workflows, and database transaction control (`db.session.commit()`, `db.session.rollback()`).
   - Models do **NOT** commit transactions themselves.

3. **Repository Layer (`repository.py`):**
   - Abstracts database queries using SQLAlchemy ORM.
   - Returns model instances or domain collections to services.

4. **Data Layer (`models.py`, `backend/database/base.py`):**
   - Pure data objects extending `BaseModel` or `ImmutableBaseModel`.
   - Uses SQLAlchemy 2.x `Mapped[...]` and `mapped_column()` declarative typing.
   - `BaseModel`: Includes `created_at` and `updated_at` timestamps for stateful entities.
   - `ImmutableBaseModel`: Omits `updated_at` for append-only audit log and history entities.
   - Models contain **NO database session or transaction management logic**.

---

## 3. Naming Conventions & Coding Standards

| Concept | Convention | Example |
| :--- | :--- | :--- |
| **Python Files & Modules** | `snake_case` | `decision_engine_runs.py` |
| **SQL Tables** | `snake_case` (plural) | `recommendation_cycles` |
| **SQL Columns** | `snake_case` | `recommendation_score` |
| **Python Classes** | `PascalCase` | `DecisionEngineConfig` |
| **Python Variables & Functions** | `snake_case` | `calculate_priority_score()` |
| **Constants & ENUM Values** | `UPPER_CASE` | `PENDING_NGO`, `DONOR` |
| **Primary Keys** | `singular_table_name_id` | `donation_id`, `ngo_request_id` |

---

## 4. Development & Git Workflow

### Development Tools:
- **Code Formatter:** `black` (`pyproject.toml`)
- **Import Sorter:** `isort` (`--profile black`)
- **Linter:** `flake8` (`.flake8`)
- **Static Type Checker:** `mypy` (`--config-file pyproject.toml`)
- **Automated Hooks:** `pre-commit` (`.pre-commit-config.yaml`)

### Git Branching Strategy:
- `main`: Production-ready code.
- `develop`: Staging & integration branch.
- `feature/<feature-name>`: Topic branches for new capabilities.
- `refactor/<refactor-name>`: Architectural and foundation improvements.
