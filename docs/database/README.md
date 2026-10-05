# FoodBridge Database Documentation

FoodBridge uses SQLAlchemy 2.x declarative models with full support for MySQL 8.0, PostgreSQL, and SQLite.

## Entity Relationship Summary

```
[users] 1 --- 1 [donors] 1 --- * [donations] 1 --- * [donation_items]
   |
   +----- 1 --- 1 [ngos] 1 --- * [ngo_date_capacities]
   |                |
   |                +----- 1 --- * [ngo_requests] 1 --- * [volunteer_assignments]
   |
   +----- 1 --- 1 [volunteers]
```

## Key Tables & Primary Keys

1. **`users`**: `user_id` (BigInteger PK), `email` (Unique), `password_hash`, `role` (Enum), `account_status` (Enum).
2. **`donors`**: `donor_id` (BigInteger PK), `user_id` (FK -> users), `organisation_name`, `latitude`, `longitude`.
3. **`ngos`**: `ngo_id` (BigInteger PK), `user_id` (FK -> users), `organisation_name`, `registration_number` (Unique), `latitude`, `longitude`, `service_radius_km`.
4. **`ngo_date_capacities`**: `date_capacity_id` (BigInteger PK), `ngo_id` (FK -> ngos), `date` (Date), `max_meals`, `allocated_meals`. Unique(`ngo_id`, `date`).
5. **`volunteers`**: `volunteer_id` (BigInteger PK), `user_id` (FK -> users), `vehicle_type`, `latitude`, `longitude`, `operational_status`.
6. **`donations`**: `donation_id` (BigInteger PK), `donor_id` (FK -> donors), `status` (Enum), `available_from`, `expiry_time`, `total_quantity`, `pickup_latitude`, `pickup_longitude`.
7. **`donation_items`**: `item_id` (BigInteger PK), `donation_id` (FK -> donations), `item_name`, `category`, `quantity`, `food_type`.
8. **`decision_engine_runs`**: `run_id` (BigInteger PK), `donation_id`, `execution_status`, `candidates_evaluated`, `eligible_candidates_count`.
9. **`recommendation_cycles`**: `recommendation_cycle_id` (BigInteger PK), `donation_id`, `top_n`, `ranking_snapshot` (JSON).
10. **`ngo_requests`**: `ngo_request_id` (BigInteger PK), `recommendation_cycle_id`, `ngo_id`, `status` (Enum), `recommendation_score`, `response_deadline`.
11. **`volunteer_assignments`**: `assignment_id` (BigInteger PK), `ngo_request_id`, `volunteer_id`, `status` (Enum), `assignment_score`, `response_deadline`.
12. **`notifications`**: `notification_id` (BigInteger PK), `user_id`, `notification_type`, `title`, `message`, `is_read`.

## Database Design Principles

- **Primary Keys**: All tables use autoincrementing `BigInteger` primary keys. `@compiles(BigInteger, "sqlite")` forces `INTEGER` DDL on SQLite so ROWID autoincrement functions seamlessly.
- **Timestamps**: `created_at` and `updated_at` timestamps managed via `BaseModel`. `@compiles(current_timestamp_on_update, "mysql")` handles dialect-specific `ON UPDATE CURRENT_TIMESTAMP`.
- **Foreign Keys**: `ondelete="CASCADE"` and `onupdate="CASCADE"` enforced across parent-child relationships.
