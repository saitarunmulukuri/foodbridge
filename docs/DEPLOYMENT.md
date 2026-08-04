# FoodBridge Production Deployment Guide

This guide details setting up FoodBridge Backend in a production environment using Gunicorn, MySQL/PostgreSQL, and Docker.

## Environment Variables

Copy `.env.example` to `.env` and set environment variables:

```bash
# Application Configuration
APP_ENV=production
SECRET_KEY=generate-a-secure-32-character-secret-key-here
JWT_SECRET_KEY=generate-a-secure-32-character-jwt-secret-here
CORS_ORIGINS=https://foodbridge.org,https://app.foodbridge.org

# Database Configuration
DATABASE_URL=mysql+pymysql://foodbridge_user:SecurePassword123@localhost:3306/foodbridge_prod

# Scheduler Configuration
SCHEDULER_ENABLED=true
SCHEDULER_INTERVAL_SECONDS=60
NGO_TIMEOUT_MINUTES=30
VOLUNTEER_TIMEOUT_MINUTES=15
```

## Running Database Migrations

```bash
flask db upgrade
```

## WSGI Server Execution (Gunicorn)

```bash
gunicorn --workers 4 --bind 0.0.0.0:5000 "backend.app:create_app()"
```

## Health & Readiness Verification

- Health Check: `GET /api/v1/health`
- Readiness Probe: `GET /api/v1/readiness`
