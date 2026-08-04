# Changelog — FoodBridge Backend

All notable changes to the FoodBridge Backend project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-RC1] - 2026-07-31

### Added
- **Full End-to-End Workflow Test Suite (`test_e2e_full_lifecycle.py`)**: 11-step integration test validating registration, donation creation, Decision Engine candidate scoring/ranking, NGO request acceptance, volunteer assignment dispatch, transit, and delivery completion.
- **Volunteer Profile API**: `GET /api/v1/volunteers/me` and `PATCH /api/v1/volunteers/me` for profile reading and location/status updates.
- **Readiness Probe Endpoint**: `GET /api/v1/readiness` for Kubernetes and load balancer health checks.
- **Background Scheduler Integration**: Threaded background scheduler for automated timeout management of un-actioned NGO requests and Volunteer assignments.
- **OpenAPI 3.0.3 Specification**: Complete REST API specification at `docs/api-spec.yaml`.
- **System Documentation**: Comprehensive technical documentation in `docs/` (`API.md`, `ARCHITECTURE.md`, `DATABASE.md`, `DECISION_ENGINE.md`, `DEPLOYMENT.md`).

### Fixed
- **Decision Engine IDOR Guard**: Enforced strict donor ownership check on `POST /api/v1/decision-engine/run`.
- **NGO Date Capacity Integration**: Aligned Decision Engine candidate finder to query `NGODateCapacity` (calendar-date based capacity) alongside legacy `NGODailyCapacity`.
- **Database Dialect Compatibility**: Added `@compiles` dialect overrides for `updated_at` timestamps and SQLite autoincrement `BigInteger` primary keys.
- **Test Suite Pass Rate**: Refactored obsolete capacity unit tests to achieve 100% test pass rate across 227 automated tests.

### Security
- Standardized JWT claims (`sub`, `role`, `iat`, `exp`, `type`) with HMAC-SHA256 signing.
- Role-Based Access Control (RBAC) enforced on all domain endpoints.
- IDOR validation on all single-entity endpoints (`donations`, `ngo/requests`, `volunteers/assignments`).
- Centralized exception handler stripping internal tracebacks in non-development modes.
