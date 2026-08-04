# FoodBridge REST API Reference

Welcome to the FoodBridge REST API documentation. All endpoints are prefixed with `/api/v1`.

## Authentication

All protected endpoints require a valid JWT Access Token passed in the HTTP header:
`Authorization: Bearer <access_token>`

### User Roles
- `DONOR`: Food donors (restaurants, hotels, supermarkets)
- `NGO`: Non-governmental recipient organizations
- `VOLUNTEER`: Transport & delivery logistics volunteers
- `ADMIN`: Platform system administrators

---

## Endpoint Summary

### System & Health Probe
- `GET /api/v1/health` — System health check & DB connectivity probe
- `GET /api/v1/readiness` — Readiness probe for Kubernetes / load balancers

### Authentication Domain (`/api/v1/auth`)
- `POST /api/v1/auth/register` — Register a new account (DONOR, NGO, VOLUNTEER)
- `POST /api/v1/auth/login` — Authenticate credentials, return access & refresh tokens
- `POST /api/v1/auth/refresh` — Issue new access token using valid refresh token

### Surplus Food Donations (`/api/v1/donations`)
- `POST /api/v1/donations` — Create a new surplus food donation (DRAFT)
- `GET /api/v1/donations` — List donations belonging to authenticated donor
- `GET /api/v1/donations/{id}` — Get single donation details (Owner-only IDOR guard)
- `POST /api/v1/donations/{id}/submit` — Submit donation for NGO matching (DRAFT → SUBMITTED)

### Decision Engine (`/api/v1/decision-engine`)
- `POST /api/v1/decision-engine/run` — Run candidate selection, eligibility pipeline, scoring, and ranking for a donation

### NGO Management & Requests (`/api/v1/ngos` & `/api/v1/ngo/requests`)
- `GET /api/v1/ngos/me` — Read NGO profile
- `PATCH /api/v1/ngos/me` — Update NGO profile
- `GET /api/v1/ngos/me/capacity` — Read date-capacity records
- `PUT /api/v1/ngos/me/capacity` — Upsert date-capacity intake limit for a calendar date
- `GET /api/v1/ngo/requests` — List donation requests issued to NGO
- `GET /api/v1/ngo/requests/{id}` — Read request detail
- `POST /api/v1/ngo/requests/{id}/accept` — Accept donation request (Triggers volunteer assignment)
- `POST /api/v1/ngo/requests/{id}/decline` — Decline donation request (Triggers fallback dispatch)

### Volunteer Logistics (`/api/v1/volunteers`)
- `GET /api/v1/volunteers/me` — Read volunteer profile
- `PATCH /api/v1/volunteers/me` — Update volunteer phone, location, or operational status
- `GET /api/v1/volunteers/assignments` — List assigned pickup tasks
- `GET /api/v1/volunteers/assignments/{id}` — Read assignment detail
- `POST /api/v1/volunteers/assignments/{id}/accept` — Accept pickup task (Status → PICKUP_IN_PROGRESS)
- `POST /api/v1/volunteers/assignments/{id}/decline` — Decline pickup task (Triggers fallback dispatch)
- `POST /api/v1/volunteers/assignments/{id}/complete` — Mark delivery complete (Status → COMPLETED)

---

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed.",
    "details": { ... }
  }
}
```
