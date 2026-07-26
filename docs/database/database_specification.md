# FoodBridge – Database Specification Document (DSD)

## 1. Overview & Architectural Standards

This document specifies the relational database design for **FoodBridge – Intelligent Food Waste Redistribution Platform**. The database layer is engineered according to production-grade relational database standards to support high concurrency, transactional integrity, decision engine execution auditing, and scalable spatial/matching queries.

### Design Standards
- **Database Engine:** MySQL 8.0+ (InnoDB Storage Engine)
- **Character Set & Collation:** `utf8mb4` / `utf8mb4_unicode_ci`
- **Normalization:** Third Normal Form (3NF) compliant
- **Primary Key Policy:** `BIGINT` with `AUTO_INCREMENT` named `singular_table_name_id`
- **Foreign Key Policy:** Matches referenced primary key name (`user_id`, `donor_id`, `ngo_id`, `donation_id`, `decision_engine_run_id`, `recommendation_cycle_id`, `ngo_request_id`, `assignment_id`, etc.)
- **Timestamp Standard:** `created_at` (TIMESTAMP) and `updated_at` (TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)
- **Immutable History Tables:** Append-only logging tables omit `updated_at` to strictly preserve history integrity.
- **Naming Conventions:** `snake_case` for all table names (plural) and column names
- **Status Columns:** Named `status` across lifecycle entities (`donations`, `ngo_requests`, `volunteer_assignments`, `notifications`, `ngo_daily_capacity`, `decision_engine_runs`, etc.)

---

## 2. Entity Specifications

---

### TABLE 1: `users`

#### 1. Purpose
Stores authentication credentials, security parameters, account status, and role classification for every platform user. Every user account belongs to exactly one platform role (`DONOR`, `NGO`, `VOLUNTEER`, `ADMIN`).

#### 2. Columns & Data Types
| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | BIGINT | No | AUTO_INCREMENT | Unique surrogate primary key |
| `email` | VARCHAR(255) | No | None | User email address used for authentication |
| `password_hash` | VARCHAR(255) | No | None | Securely hashed user password string |
| `role` | ENUM('DONOR', 'NGO', 'VOLUNTEER', 'ADMIN') | No | None | Platform role determining access permissions |
| `account_status` | ENUM('ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE') | No | 'PENDING' | Current state of user account |
| `last_login` | DATETIME | Yes | NULL | Timestamp of most recent user login |
| `created_at` | TIMESTAMP | No | CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | No | CURRENT_TIMESTAMP ON UPDATE | Record last modification timestamp |

#### 3. Constraints
- **Primary Key:** `PRIMARY KEY (user_id)`
- **Unique Constraint:** `UNIQUE KEY uq_users_email (email)`
- **Not Null Constraints:** `email`, `password_hash`, `role`, `account_status`, `created_at`, `updated_at`

#### 4. Primary Key
- `user_id` (BIGINT AUTO_INCREMENT)

#### 5. Foreign Keys
- None (Root identity entity for all platform actors)

#### 6. Indexes
- `PRIMARY KEY (user_id)`
- `UNIQUE INDEX uq_users_email (email)`
- `INDEX idx_users_role (role)`
- `INDEX idx_users_account_status (account_status)`

#### 7. Relationships
- One-to-One / One-to-Zero-or-One with `donors` (`users.user_id` → `donors.user_id`)
- One-to-One / One-to-Zero-or-One with `ngos` (`users.user_id` → `ngos.user_id`)
- One-to-One / One-to-Zero-or-One with `volunteers` (`users.user_id` → `volunteers.user_id`)

#### 8. Business Rules
- Email addresses must be unique across the platform and properly validated.
- Password hashes must be stored using strong cryptographic algorithms (Argon2 or Bcrypt).
- Account status defaults to `PENDING` upon registration until verification.

#### 9. Scalability Notes
- High read ratio; prime candidate for Redis caching by `user_id` and `email`.

#### 10. Future Considerations
- Columns for Multi-Factor Authentication (MFA) metadata.

---

### TABLE 2: `donors`

#### 1. Purpose
Stores profile details, contact information, geographic location, active profile flag, and administrative verification status for food donating entities.

#### 2. Columns & Data Types
| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `donor_id` | BIGINT | No | AUTO_INCREMENT | Unique donor surrogate primary key |
| `user_id` | BIGINT | No | None | Foreign key referencing `users.user_id` |
| `organisation_name` | VARCHAR(200) | No | None | Legal or commercial name of donor organization |
| `contact_person` | VARCHAR(100) | No | None | Name of primary contact representative |
| `phone` | VARCHAR(20) | No | None | Primary phone number for pickup logistics |
| `address` | TEXT | No | None | Physical address for food pickup |
| `latitude` | DECIMAL(10, 7) | No | None | Geolocation latitude coordinate |
| `longitude` | DECIMAL(10, 7) | No | None | Geolocation longitude coordinate |
| `verification_status` | ENUM('VERIFIED', 'PENDING', 'REJECTED') | No | 'PENDING' | Admin verification state of donor |
| `is_active` | BOOLEAN | No | TRUE | Operational soft-deactivation flag |
| `created_at` | TIMESTAMP | No | CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | No | CURRENT_TIMESTAMP ON UPDATE | Record last modification timestamp |

#### 3. Constraints
- **Primary Key:** `PRIMARY KEY (donor_id)`
- **Foreign Key:** `FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE`
- **Unique Constraint:** `UNIQUE KEY uq_donors_user_id (user_id)`

#### 4. Primary Key
- `donor_id` (BIGINT AUTO_INCREMENT)

#### 5. Foreign Keys
- `user_id` → References `users(user_id)`

#### 6. Indexes
- `PRIMARY KEY (donor_id)`
- `UNIQUE INDEX uq_donors_user_id (user_id)`
- `INDEX idx_donors_verification_status (verification_status)`
- `INDEX idx_donors_is_active (is_active)`

#### 7. Relationships
- Belongs to `users` via `user_id`.
- Has many `donations` (`donors.donor_id` → `donations.donor_id`).

#### 8. Business Rules
- Must map to a user with role `DONOR`.
- `is_active` allows deactivating a profile while preserving historic transaction logs.
- `verification_status` must be `VERIFIED` before posting donations.

#### 9. Scalability Notes
- Geolocation fields (`latitude`, `longitude`) can be mirrored in Redis Geospatial sets.

#### 10. Future Considerations
- Plan for a MySQL 8 Spatial `location_point` (`POINT SRID 4326`) column with `SPATIAL INDEX`.

---

### TABLE 3: `ngos`

#### 1. Purpose
Stores profile information, registration details, operational service radius, contact details, active status flag, and verification status for recipient Non-Governmental Organizations.

#### 2. Columns & Data Types
| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ngo_id` | BIGINT | No | AUTO_INCREMENT | Unique NGO surrogate primary key |
| `user_id` | BIGINT | No | None | Foreign key referencing `users.user_id` |
| `organisation_name` | VARCHAR(200) | No | None | Registered name of the NGO/shelter |
| `registration_number` | VARCHAR(100) | No | None | Official government/charity registration number |
| `contact_person` | VARCHAR(100) | No | None | Name of primary coordinator |
| `phone` | VARCHAR(20) | No | None | Primary phone number for delivery coordination |
| `address` | TEXT | No | None | Physical distribution/drop-off address |
| `latitude` | DECIMAL(10, 7) | No | None | Geolocation latitude coordinate |
| `longitude` | DECIMAL(10, 7) | No | None | Geolocation longitude coordinate |
| `service_radius_km` | INT | No | 15 | Maximum operational pickup radius in km |
| `verification_status` | ENUM('VERIFIED', 'PENDING', 'REJECTED') | No | 'PENDING' | Admin verification state of NGO |
| `is_active` | BOOLEAN | No | TRUE | Operational soft-deactivation flag |
| `created_at` | TIMESTAMP | No | CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | No | CURRENT_TIMESTAMP ON UPDATE | Record last modification timestamp |

#### 3. Constraints
- **Primary Key:** `PRIMARY KEY (ngo_id)`
- **Foreign Key:** `FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE`
- **Unique Constraint:** `UNIQUE KEY uq_ngos_user_id (user_id)`
- **Unique Constraint:** `UNIQUE KEY uq_ngos_registration_number (registration_number)`
- **Check Constraint:** `CHECK (service_radius_km > 0)`

#### 4. Primary Key
- `ngo_id` (BIGINT AUTO_INCREMENT)

#### 5. Foreign Keys
- `user_id` → References `users(user_id)`

#### 6. Indexes
- `PRIMARY KEY (ngo_id)`
- `UNIQUE INDEX uq_ngos_user_id (user_id)`
- `UNIQUE INDEX uq_ngos_registration_number (registration_number)`
- `INDEX idx_ngos_service_radius (service_radius_km)`
- `INDEX idx_ngos_verification_status (verification_status)`
- `INDEX idx_ngos_is_active (is_active)`

#### 7. Relationships
- Belongs to `users` via `user_id`.
- Has many `ngo_daily_capacity` entries (`ngos.ngo_id` → `ngo_daily_capacity.ngo_id`).
- Has many `ngo_requests` entries (`ngos.ngo_id` → `ngo_requests.ngo_id`).

#### 8. Business Rules
- Must link to a valid user with role `NGO`.
- `registration_number` must be unique across all registered NGOs.
- Only active (`is_active = TRUE`) and verified (`VERIFIED`) NGOs are eligible for Decision Engine matching.

#### 9. Scalability Notes
- Frequently read during algorithm evaluation. Cache verified active NGOs in Redis.

#### 10. Future Considerations
- Spatial `POINT` column (`location_point`) with `SPATIAL INDEX` for bounding-circle spatial queries (`ST_Within`, `ST_Buffer`).

---

### TABLE 4: `ngo_daily_capacity`

#### 1. Purpose
Tracks the operational food acceptance capacity limits and real-time remaining capacity for an NGO on a per-day-of-week basis. Used by the Decision Engine to prevent over-allocation.

#### 2. Columns & Data Types
| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `capacity_id` | BIGINT | No | AUTO_INCREMENT | Unique capacity record primary key |
| `ngo_id` | BIGINT | No | None | Foreign key referencing `ngos.ngo_id` |
| `day_of_week` | ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') | No | None | Day of the week for this capacity profile |
| `max_meals` | INT | No | 0 | Maximum meal capacity threshold per day |
| `remaining_capacity` | INT | No | 0 | Real-time available meal capacity count remaining |
| `status` | ENUM('ACTIVE', 'PAUSED', 'FULL') | No | 'ACTIVE' | Capacity operational status |
| `created_at` | TIMESTAMP | No | CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | No | CURRENT_TIMESTAMP ON UPDATE | Record last modification timestamp |

#### 3. Constraints
- **Primary Key:** `PRIMARY KEY (capacity_id)`
- **Foreign Key:** `FOREIGN KEY (ngo_id) REFERENCES ngos(ngo_id) ON DELETE CASCADE`
- **Unique Constraint:** `UNIQUE KEY uq_ngo_daily_capacity (ngo_id, day_of_week)`
- **Check Constraints:** `CHECK (max_meals >= 0)`, `CHECK (remaining_capacity >= 0)`

#### 4. Primary Key
- `capacity_id` (BIGINT AUTO_INCREMENT)

#### 5. Foreign Keys
- `ngo_id` → References `ngos(ngo_id)`

#### 6. Indexes
- `PRIMARY KEY (capacity_id)`
- `UNIQUE INDEX uq_ngo_daily_capacity (ngo_id, day_of_week)`
- `INDEX idx_ngo_capacity_status (status)`

#### 7. Relationships
- Belongs to `ngos` via `ngo_id`.

#### 8. Business Rules
- Each NGO has up to 7 capacity entries (one per day of week).
- `remaining_capacity` is decremented when an NGO accepts a donation claim and reset daily via midnight scheduled tasks.
- If `remaining_capacity` reaches 0, `status` transitions automatically to `FULL`, excluding the NGO from Decision Engine evaluation for that day.

#### 9. Scalability Notes
- Frequently read and updated during matching cycles. Atomic decrements on `remaining_capacity` should be managed via optimistic locking or Redis atomic counters.

#### 10. Future Considerations
- Capacity constraints by weight (`max_weight_kg`) and food category filters.

---

### TABLE 5: `volunteers`

#### 1. Purpose
Stores volunteer profile data, transportation vehicle mode, real-time availability status, active status flag, and location for food logistics dispatch.

#### 2. Columns & Data Types
| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `volunteer_id` | BIGINT | No | AUTO_INCREMENT | Unique volunteer surrogate primary key |
| `user_id` | BIGINT | No | None | Foreign key referencing `users.user_id` |
| `phone` | VARCHAR(20) | No | None | Contact phone number for logistics |
| `vehicle_type` | ENUM('WALKING', 'BICYCLE', 'BIKE', 'SCOOTER', 'CAR', 'VAN') | No | None | Mode of transportation |
| `latitude` | DECIMAL(10, 7) | Yes | NULL | Real-time latitude coordinate |
| `longitude` | DECIMAL(10, 7) | Yes | NULL | Real-time longitude coordinate |
| `operational_status` | ENUM('AVAILABLE', 'BUSY', 'OFFLINE') | No | 'OFFLINE' | Real-time availability status |
| `verification_status` | ENUM('VERIFIED', 'PENDING', 'REJECTED') | No | 'PENDING' | Admin verification state |
| `is_active` | BOOLEAN | No | TRUE | Operational soft-deactivation flag |
| `created_at` | TIMESTAMP | No | CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | No | CURRENT_TIMESTAMP ON UPDATE | Record last modification timestamp |

#### 3. Constraints
- **Primary Key:** `PRIMARY KEY (volunteer_id)`
- **Foreign Key:** `FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE`
- **Unique Constraint:** `UNIQUE KEY uq_volunteers_user_id (user_id)`

#### 4. Primary Key
- `volunteer_id` (BIGINT AUTO_INCREMENT)

#### 5. Foreign Keys
- `user_id` → References `users(user_id)`

#### 6. Indexes
- `PRIMARY KEY (volunteer_id)`
- `UNIQUE INDEX uq_volunteers_user_id (user_id)`
- `INDEX idx_volunteers_operational_status (operational_status)`
- `INDEX idx_volunteers_verification_status (verification_status)`
- `INDEX idx_volunteers_is_active (is_active)`

#### 7. Relationships
- Belongs to `users` via `user_id`.
- Has many `volunteer_assignments` (`volunteers.volunteer_id` → `volunteer_assignments.volunteer_id`).

#### 8. Business Rules
- Must map to a user with role `VOLUNTEER`.
- `operational_status` and `is_active = TRUE` determine dispatch eligibility (`AVAILABLE`).

#### 9. Scalability Notes
- Frequent location telemetry updates. Offload live telemetry to Redis Geo sets.

#### 10. Future Considerations
- Future spatial `POINT` column (`location_point`) for spatial KNN volunteer search queries.

---

### TABLE 6: `donations`

#### 1. Purpose
Represents a surplus food donation created by a donor entity (or created on behalf of a donor by an Admin user). Stores donation metadata, pickup location details, expiration/availability windows, fulfillment preferences, created_by user audit tracking, and lifecycle status.

#### 2. Columns & Data Types
| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `donation_id` | BIGINT | No | AUTO_INCREMENT | Unique donation surrogate primary key |
| `donor_id` | BIGINT | No | None | Foreign key referencing `donors.donor_id` |
| `created_by_user_id` | BIGINT | Yes | NULL | Foreign key referencing `users.user_id` (tracks user/admin who created donation) |
| `donation_title` | VARCHAR(150) | No | None | Concise title summarizing the donation |
| `description` | TEXT | Yes | NULL | Detailed description of surplus food offer |
| `prepared_time` | DATETIME | Yes | NULL | Timestamp when food was cooked |
| `available_from` | DATETIME | No | None | Start timestamp of pickup availability window |
| `expiry_time` | DATETIME | No | None | Safety expiration timestamp |
| `total_quantity` | DECIMAL(10, 2) | No | None | Total quantity count/weight |
| `quantity_unit` | ENUM('KG', 'GRAM', 'LITRE', 'ML', 'BOX', 'PACKET', 'PLATE') | No | None | Measurement unit |
| `pickup_address` | TEXT | No | None | Pickup location address |
| `pickup_landmark` | VARCHAR(200) | Yes | NULL | Nearby landmark |
| `pickup_city` | VARCHAR(100) | No | None | City name |
| `pickup_state` | VARCHAR(100) | No | None | State / Province name |
| `pickup_postal_code` | VARCHAR(20) | No | None | Postal / Zip code |
| `pickup_latitude` | DECIMAL(10, 7) | No | None | Geolocation latitude |
| `pickup_longitude` | DECIMAL(10, 7) | No | None | Geolocation longitude |
| `delivery_preference` | ENUM('DONOR_DELIVERY', 'PICKUP_REQUIRED') | No | 'PICKUP_REQUIRED' | Transportation delivery method preference |
| `status` | ENUM('DRAFT', 'SUBMITTED', 'PENDING_NGO', 'NGO_ACCEPTED', 'VOLUNTEER_PENDING', 'PICKUP_IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'EXPIRED', 'CANCELLED') | No | 'DRAFT' | Lifecycle state of donation |
| `special_instructions` | TEXT | Yes | NULL | Handling instructions |
| `created_at` | TIMESTAMP | No | CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | No | CURRENT_TIMESTAMP ON UPDATE | Record last modification timestamp |

#### 3. Constraints
- **Primary Key:** `PRIMARY KEY (donation_id)`
- **Foreign Key:** `FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE CASCADE`
- **Foreign Key:** `FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL`

#### 4. Primary Key
- `donation_id` (BIGINT AUTO_INCREMENT)

#### 5. Foreign Keys
- `donor_id` → References `donors(donor_id)`
- `created_by_user_id` → References `users(user_id)`

#### 6. Indexes
- `PRIMARY KEY (donation_id)`
- `INDEX idx_donations_donor_id (donor_id)`
- `INDEX idx_donations_created_by (created_by_user_id)`
- `INDEX idx_donations_status (status)`
- `INDEX idx_donations_expiry_time (expiry_time)`
- `INDEX idx_donations_available_from (available_from)`
- `INDEX idx_donations_pickup_city (pickup_city)`
- `INDEX idx_donations_status_expiry (status, expiry_time)`

#### 7. Relationships
- Belongs to `donors` via `donor_id`.
- Belongs to `users` via `created_by_user_id` (nullable).
- Has many `donation_items` (`donations.donation_id` → `donation_items.donation_id`).
- Has many `decision_engine_runs` (`donations.donation_id` → `decision_engine_runs.donation_id`).
- Has many `donation_status_history` (`donations.donation_id` → `donation_status_history.donation_id`).

#### 8. Business Rules
- **Architectural Rule:** `food_type` is **NOT** stored in this table. It is derived dynamically from child `donation_items` to avoid duplicate data.
- Enters Decision Engine evaluation loop upon transition to `status = 'SUBMITTED'`.
- `created_by_user_id` preserves enterprise auditability if an Admin or System proxy creates a donation on behalf of a Donor.

#### 9. Scalability Notes
- Partitioning candidate by `created_at` (monthly RANGE partitions) at scale. Composite index `(status, expiry_time)` optimizes active non-expired donation queries.

#### 10. Future Considerations
- Spatial `POINT` column (`pickup_point`) with `SPATIAL INDEX` for distance calculations.

---

### TABLE 7: `donation_items`

#### 1. Purpose
Stores individual food items belonging to a donation offer, capturing categorization, quantities, dietary food type classifications, and allergen disclosures.

#### 2. Columns & Data Types
| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `item_id` | BIGINT | No | AUTO_INCREMENT | Unique donation item primary key |
| `donation_id` | BIGINT | No | None | Foreign key referencing `donations.donation_id` |
| `item_name` | VARCHAR(150) | No | None | Name of food item |
| `category` | ENUM('RICE', 'CURRY', 'BREAD', 'VEGETABLE', 'FRUIT', 'SNACK', 'BEVERAGE', 'DESSERT', 'OTHER') | No | None | Item category |
| `quantity` | DECIMAL(10, 2) | No | None | Quantity |
| `unit` | ENUM('KG', 'GRAM', 'LITRE', 'ML', 'BOX', 'PACKET', 'PLATE') | No | None | Measurement unit |
| `food_type` | ENUM('VEGETARIAN', 'NON_VEGETARIAN', 'VEGAN') | No | None | Dietary classification |
| `contains_allergens` | BOOLEAN | No | FALSE | Flag indicating allergens |
| `allergen_details` | TEXT | Yes | NULL | Allergen disclosures |
| `created_at` | TIMESTAMP | No | CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | No | CURRENT_TIMESTAMP ON UPDATE | Record last modification timestamp |

#### 3. Constraints
- **Primary Key:** `PRIMARY KEY (item_id)`
- **Foreign Key:** `FOREIGN KEY (donation_id) REFERENCES donations(donation_id) ON DELETE CASCADE`

#### 4. Primary Key
- `item_id` (BIGINT AUTO_INCREMENT)

#### 5. Foreign Keys
- `donation_id` → References `donations(donation_id)`

#### 6. Indexes
- `PRIMARY KEY (item_id)`
- `INDEX idx_donation_items_donation_id (donation_id)`
- `INDEX idx_donation_items_category (category)`
- `INDEX idx_donation_items_food_type (food_type)`

#### 7. Relationships
- Belongs to `donations` via `donation_id`.

#### 8. Business Rules
- Deleting parent donation cascade-deletes items.
- Parent donation's overall food type is derived from child items' `food_type`.

#### 9. Scalability Notes
- Composite index on `(donation_id, food_type)` speeds up dietary aggregation.

#### 10. Future Considerations
- Caloric and nutritional estimate fields.

---

### TABLE 8: `decision_engine_runs`

#### 1. Purpose
Represents the technical execution run of the Decision Engine matching algorithm for a donation. Separates technical execution metrics (latency, algorithm version, raw scoring snapshots, failure reasons) from business workflow entities.

#### 2. Columns & Data Types
| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `decision_engine_run_id` | BIGINT | No | AUTO_INCREMENT | Unique execution run primary key |
| `donation_id` | BIGINT | No | None | Foreign key referencing `donations.donation_id` |
| `algorithm_version` | VARCHAR(20) | No | None | Version string of algorithm executed |
| `execution_status` | ENUM('SUCCESS', 'FAILED', 'NO_CANDIDATES', 'TIMEOUT') | No | None | Execution outcome status |
| `started_at` | DATETIME | No | None | Timestamp when algorithm execution started |
| `completed_at` | DATETIME | Yes | NULL | Timestamp when algorithm execution completed |
| `execution_time_ms` | INT | Yes | NULL | Execution latency duration in milliseconds |
| `failure_reason` | TEXT | Yes | NULL | Error traceback summary if execution failed |
| `ranking_snapshot` | JSON | Yes | NULL | Raw JSON snapshot of candidate scores and weight parameters |
| `created_at` | TIMESTAMP | No | CURRENT_TIMESTAMP | Record creation timestamp |

#### 3. Constraints
- **Primary Key:** `PRIMARY KEY (decision_engine_run_id)`
- **Foreign Key:** `FOREIGN KEY (donation_id) REFERENCES donations(donation_id) ON DELETE CASCADE`

#### 4. Primary Key
- `decision_engine_run_id` (BIGINT AUTO_INCREMENT)

#### 5. Foreign Keys
- `donation_id` → References `donations(donation_id)`

#### 6. Indexes
- `PRIMARY KEY (decision_engine_run_id)`
- `INDEX idx_de_runs_donation_id (donation_id)`
- `INDEX idx_de_runs_status (execution_status)`
- `INDEX idx_de_runs_created_at (created_at)`

#### 7. Relationships
- Belongs to `donations` via `donation_id`.
- Has many `recommendation_cycles` (`decision_engine_runs.decision_engine_run_id` → `recommendation_cycles.decision_engine_run_id`).

#### 8. Business Rules
- Executed every time matching logic is triggered for a donation.
- Stores full candidate scoring breakdown in `ranking_snapshot` (JSON) for algorithmic debugging and model tuning.

#### 9. Scalability Notes
- High data volume per run due to JSON snapshots. Append-only; candidate for monthly RANGE partitioning by `created_at` and S3 archiving.

#### 10. Future Considerations
- Direct Integration with ML model monitoring tools (MLflow / Weights & Biases).

---

### TABLE 9: `recommendation_cycles`

#### 1. Purpose
Represents a business recommendation cycle generated from a successful Decision Engine run. Decouples business workflow and NGO request dispatches from technical algorithm execution runs.

#### 2. Columns & Data Types
| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `recommendation_cycle_id` | BIGINT | No | AUTO_INCREMENT | Unique recommendation cycle primary key |
| `donation_id` | BIGINT | No | None | Foreign key referencing `donations.donation_id` |
| `decision_engine_run_id` | BIGINT | No | None | Foreign key referencing `decision_engine_runs.decision_engine_run_id` |
| `algorithm_version` | VARCHAR(20) | No | None | Version identifier of algorithm |
| `trigger_reason` | ENUM('NEW_DONATION', 'DONATION_UPDATED', 'MANUAL_RETRY', 'ADMIN_RETRY') | No | None | System event trigger |
| `created_at` | TIMESTAMP | No | CURRENT_TIMESTAMP | Record creation timestamp |

#### 3. Constraints
- **Primary Key:** `PRIMARY KEY (recommendation_cycle_id)`
- **Foreign Key:** `FOREIGN KEY (donation_id) REFERENCES donations(donation_id) ON DELETE CASCADE`
- **Foreign Key:** `FOREIGN KEY (decision_engine_run_id) REFERENCES decision_engine_runs(decision_engine_run_id) ON DELETE CASCADE`

#### 4. Primary Key
- `recommendation_cycle_id` (BIGINT AUTO_INCREMENT)

#### 5. Foreign Keys
- `donation_id` → References `donations(donation_id)`
- `decision_engine_run_id` → References `decision_engine_runs(decision_engine_run_id)`

#### 6. Indexes
- `PRIMARY KEY (recommendation_cycle_id)`
- `INDEX idx_recommendation_cycles_donation_id (donation_id)`
- `INDEX idx_recommendation_cycles_run_id (decision_engine_run_id)`

#### 7. Relationships
- Belongs to `donations` via `donation_id`.
- Belongs to `decision_engine_runs` via `decision_engine_run_id`.
- Has many `ngo_requests` (`recommendation_cycles.recommendation_cycle_id` → `ngo_requests.recommendation_cycle_id`).

#### 8. Business Rules
- One Donation → Many Decision Engine Runs → Many Recommendation Cycles → Many NGO Requests.

#### 9. Scalability Notes
- Append-only log architecture. Partitionable by `created_at`.

#### 10. Future Considerations
- Cycle completion SLA metric tracking columns.

---

### TABLE 10: `ngo_requests`

#### 1. Purpose
Stores candidate NGO recommendation attempts generated within a Recommendation Cycle, ranked by Decision Engine score.

#### 2. Columns & Data Types
| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ngo_request_id` | BIGINT | No | AUTO_INCREMENT | Unique NGO request primary key |
| `recommendation_cycle_id` | BIGINT | No | None | Foreign key referencing `recommendation_cycles.recommendation_cycle_id` |
| `ngo_id` | BIGINT | No | None | Foreign key referencing `ngos.ngo_id` |
| `recommendation_rank` | INT | No | None | Ordinal rank assigned by Decision Engine |
| `recommendation_score` | DECIMAL(6, 2) | No | None | Computed matching score |
| `response_deadline` | DATETIME | No | None | Deadline for NGO response |
| `responded_at` | DATETIME | Yes | NULL | Timestamp when NGO responded |
| `status` | ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'TIMED_OUT', 'AUTO_CANCELLED') | No | 'PENDING' | Lifecycle state |
| `rejection_reason` | TEXT | Yes | NULL | Rejection feedback |
| `created_at` | TIMESTAMP | No | CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | No | CURRENT_TIMESTAMP ON UPDATE | Record last modification timestamp |

#### 3. Constraints
- **Primary Key:** `PRIMARY KEY (ngo_request_id)`
- **Foreign Key:** `FOREIGN KEY (recommendation_cycle_id) REFERENCES recommendation_cycles(recommendation_cycle_id) ON DELETE CASCADE`
- **Foreign Key:** `FOREIGN KEY (ngo_id) REFERENCES ngos(ngo_id) ON DELETE CASCADE`
- **Unique Constraint:** `UNIQUE KEY uq_ngo_requests_cycle_rank (recommendation_cycle_id, recommendation_rank)`
- **Unique Constraint:** `UNIQUE KEY uq_ngo_requests_cycle_ngo (recommendation_cycle_id, ngo_id)`
- **Check Constraint:** `CHECK (recommendation_score >= 0.00 AND recommendation_score <= 100.00)`

#### 4. Primary Key
- `ngo_request_id` (BIGINT AUTO_INCREMENT)

#### 5. Foreign Keys
- `recommendation_cycle_id` → References `recommendation_cycles(recommendation_cycle_id)`
- `ngo_id` → References `ngos(ngo_id)`

#### 6. Indexes
- `PRIMARY KEY (ngo_request_id)`
- `INDEX idx_ngo_requests_cycle_id (recommendation_cycle_id)`
- `INDEX idx_ngo_requests_ngo_id (ngo_id)`
- `INDEX idx_ngo_requests_status (status)`
- `INDEX idx_ngo_requests_status_deadline (status, response_deadline)`

#### 7. Relationships
- Belongs to `recommendation_cycles`.
- Belongs to `ngos`.
- Has many `volunteer_assignments`.

#### 8. Business Rules
- Only one request may be `ACCEPTED` per Recommendation Cycle.
- Expiration of `response_deadline` triggers `TIMED_OUT` and dispatches next rank.
- `recommendation_score` is constrained between 0.00 and 100.00.

#### 9. Scalability Notes
- Composite index on `(status, response_deadline)` speeds up timeout worker queries.

#### 10. Future Considerations
- Automated push notification reminder triggers.

---

### TABLE 11: `volunteer_assignments`

#### 1. Purpose
Stores volunteer pickup and delivery dispatch assignment attempts created after an NGO accepts a recommendation (`ngo_request`). References `ngo_request_id`, NOT `donation_id`.

#### 2. Columns & Data Types
| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `assignment_id` | BIGINT | No | AUTO_INCREMENT | Unique assignment primary key |
| `ngo_request_id` | BIGINT | No | None | Foreign key referencing `ngo_requests.ngo_request_id` |
| `volunteer_id` | BIGINT | No | None | Foreign key referencing `volunteers.volunteer_id` |
| `assignment_rank` | INT | No | None | Ordinal dispatch rank |
| `assignment_score` | DECIMAL(6, 2) | No | None | Computed matching score |
| `response_deadline` | DATETIME | No | None | Deadline for volunteer response |
| `responded_at` | DATETIME | Yes | NULL | Timestamp when volunteer responded |
| `status` | ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'TIMED_OUT', 'AUTO_CANCELLED') | No | 'PENDING' | Lifecycle state |
| `created_at` | TIMESTAMP | No | CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | No | CURRENT_TIMESTAMP ON UPDATE | Record last modification timestamp |

#### 3. Constraints
- **Primary Key:** `PRIMARY KEY (assignment_id)`
- **Foreign Key:** `FOREIGN KEY (ngo_request_id) REFERENCES ngo_requests(ngo_request_id) ON DELETE CASCADE`
- **Foreign Key:** `FOREIGN KEY (volunteer_id) REFERENCES volunteers(volunteer_id) ON DELETE CASCADE`
- **Unique Constraint:** `UNIQUE KEY uq_volunteer_assignments_req_rank (ngo_request_id, assignment_rank)`
- **Unique Constraint:** `UNIQUE KEY uq_volunteer_assignments_req_volunteer (ngo_request_id, volunteer_id)`
- **Check Constraint:** `CHECK (assignment_score >= 0.00 AND assignment_score <= 100.00)`

#### 4. Primary Key
- `assignment_id` (BIGINT AUTO_INCREMENT)

#### 5. Foreign Keys
- `ngo_request_id` → References `ngo_requests(ngo_request_id)`
- `volunteer_id` → References `volunteers(volunteer_id)`

#### 6. Indexes
- `PRIMARY KEY (assignment_id)`
- `INDEX idx_volunteer_assignments_request_id (ngo_request_id)`
- `INDEX idx_volunteer_assignments_volunteer_id (volunteer_id)`
- `INDEX idx_volunteer_assignments_status (status)`
- `INDEX idx_vol_assign_status_deadline (status, response_deadline)`

#### 7. Relationships
- Belongs to `ngo_requests`.
- Belongs to `volunteers`.

#### 8. Business Rules
- Volunteer Assignments reference `ngo_requests` (`ngo_request_id`), NOT `donations`.
- Rejection or timeout automatically dispatches next ranked volunteer.
- `assignment_score` is constrained between 0.00 and 100.00.

#### 9. Scalability Notes
- Composite index on `(status, response_deadline)` optimizes timeout dispatch polling.

#### 10. Future Considerations
- OTP / QR code proof of pickup verification fields.

---

### TABLE 12: `donation_status_history`

#### 1. Purpose
Maintains a complete, immutable audit trail logging every status transition for a donation.

#### 2. Columns & Data Types
| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `donation_status_history_id` | BIGINT | No | AUTO_INCREMENT | Unique history primary key |
| `donation_id` | BIGINT | No | None | Foreign key referencing `donations.donation_id` |
| `previous_status` | ENUM('DRAFT', 'SUBMITTED', 'PENDING_NGO', 'NGO_ACCEPTED', 'VOLUNTEER_PENDING', 'PICKUP_IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'EXPIRED', 'CANCELLED') | Yes | NULL | Previous status |
| `new_status` | ENUM('DRAFT', 'SUBMITTED', 'PENDING_NGO', 'NGO_ACCEPTED', 'VOLUNTEER_PENDING', 'PICKUP_IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'EXPIRED', 'CANCELLED') | No | None | New status |
| `changed_by_user_id` | BIGINT | Yes | NULL | Foreign key referencing `users.user_id` (NULL if system) |
| `change_reason` | TEXT | Yes | NULL | Reason for state change |
| `changed_at` | TIMESTAMP | No | CURRENT_TIMESTAMP | Timestamp when change occurred |

#### 3. Constraints
- **Primary Key:** `PRIMARY KEY (donation_status_history_id)`
- **Foreign Key:** `FOREIGN KEY (donation_id) REFERENCES donations(donation_id) ON DELETE CASCADE`
- **Foreign Key:** `FOREIGN KEY (changed_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL`

#### 4. Primary Key
- `donation_status_history_id` (BIGINT AUTO_INCREMENT)

#### 5. Foreign Keys
- `donation_id` → References `donations(donation_id)`
- `changed_by_user_id` → References `users(user_id)`

#### 6. Indexes
- `PRIMARY KEY (donation_status_history_id)`
- `INDEX idx_donation_status_history_donation_id (donation_id)`
- `INDEX idx_donation_status_history_changed_at (changed_at)`

#### 7. Relationships
- Belongs to `donations`.

#### 8. Business Rules
- Strictly immutable append-only records. `updated_at` column is intentionally omitted.

#### 9. Scalability Notes
- Partitionable by `changed_at`.

#### 10. Future Considerations
- Long-term archiving to cold data storage.

---

### TABLE 13: `ngo_request_history`

#### 1. Purpose
Tracks every state transition of NGO requests during a recommendation cycle.

#### 2. Columns & Data Types
| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ngo_request_history_id` | BIGINT | No | AUTO_INCREMENT | Unique NGO request history primary key |
| `ngo_request_id` | BIGINT | No | None | Foreign key referencing `ngo_requests.ngo_request_id` |
| `previous_status` | ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'TIMED_OUT', 'AUTO_CANCELLED') | Yes | NULL | Previous status |
| `new_status` | ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'TIMED_OUT', 'AUTO_CANCELLED') | No | None | New status |
| `changed_by_user_id` | BIGINT | Yes | NULL | Foreign key referencing `users.user_id` |
| `change_reason` | TEXT | Yes | NULL | Reason for state change |
| `changed_at` | TIMESTAMP | No | CURRENT_TIMESTAMP | Timestamp when change occurred |

#### 3. Constraints
- **Primary Key:** `PRIMARY KEY (ngo_request_history_id)`
- **Foreign Key:** `FOREIGN KEY (ngo_request_id) REFERENCES ngo_requests(ngo_request_id) ON DELETE CASCADE`
- **Foreign Key:** `FOREIGN KEY (changed_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL`

#### 4. Primary Key
- `ngo_request_history_id` (BIGINT AUTO_INCREMENT)

#### 5. Foreign Keys
- `ngo_request_id` → References `ngo_requests(ngo_request_id)`
- `changed_by_user_id` → References `users(user_id)`

#### 6. Indexes
- `PRIMARY KEY (ngo_request_history_id)`
- `INDEX idx_ngo_request_history_request_id (ngo_request_id)`
- `INDEX idx_ngo_request_history_changed_at (changed_at)`

#### 7. Relationships
- Belongs to `ngo_requests`.

#### 8. Business Rules
- Immutable audit log records. `updated_at` column is intentionally omitted.

#### 9. Scalability Notes
- Append-only write pattern.

#### 10. Future Considerations
- Timeout latency profiling analytics.

---

### TABLE 14: `assignment_history`

#### 1. Purpose
Tracks every state transition for volunteer pickup/delivery assignments.

#### 2. Columns & Data Types
| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `assignment_history_id` | BIGINT | No | AUTO_INCREMENT | Unique assignment history primary key |
| `assignment_id` | BIGINT | No | None | Foreign key referencing `volunteer_assignments.assignment_id` |
| `previous_status` | ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'TIMED_OUT', 'AUTO_CANCELLED') | Yes | NULL | Previous status |
| `new_status` | ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'TIMED_OUT', 'AUTO_CANCELLED') | No | None | New status |
| `changed_by_user_id` | BIGINT | Yes | NULL | Foreign key referencing `users.user_id` |
| `change_reason` | TEXT | Yes | NULL | Reason for state change |
| `changed_at` | TIMESTAMP | No | CURRENT_TIMESTAMP | Timestamp when change occurred |

#### 3. Constraints
- **Primary Key:** `PRIMARY KEY (assignment_history_id)`
- **Foreign Key:** `FOREIGN KEY (assignment_id) REFERENCES volunteer_assignments(assignment_id) ON DELETE CASCADE`
- **Foreign Key:** `FOREIGN KEY (changed_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL`

#### 4. Primary Key
- `assignment_history_id` (BIGINT AUTO_INCREMENT)

#### 5. Foreign Keys
- `assignment_id` → References `volunteer_assignments(assignment_id)`
- `changed_by_user_id` → References `users(user_id)`

#### 6. Indexes
- `PRIMARY KEY (assignment_history_id)`
- `INDEX idx_assignment_history_assignment_id (assignment_id)`
- `INDEX idx_assignment_history_changed_at (changed_at)`

#### 7. Relationships
- Belongs to `volunteer_assignments`.

#### 8. Business Rules
- Immutable audit log records. `updated_at` column is intentionally omitted.

#### 9. Scalability Notes
- Append-only write pattern.

#### 10. Future Considerations
- SLA breach tracking.

---

### TABLE 15: `notifications`

#### 1. Purpose
Stores in-app, email, SMS, and push notifications generated by the system for platform users.

#### 2. Columns & Data Types
| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `notification_id` | BIGINT | No | AUTO_INCREMENT | Unique notification primary key |
| `user_id` | BIGINT | No | None | Foreign key referencing `users.user_id` |
| `notification_type` | ENUM('DONATION_CREATED', 'NGO_REQUEST', 'VOLUNTEER_REQUEST', 'DONATION_ACCEPTED', 'DONATION_REJECTED', 'PICKUP_ASSIGNED', 'DELIVERY_COMPLETED', 'SYSTEM') | No | None | Event classification |
| `title` | VARCHAR(150) | No | None | Notification headline |
| `message` | TEXT | No | None | Message body |
| `status` | ENUM('UNREAD', 'READ') | No | 'UNREAD' | Read state |
| `delivery_channel` | ENUM('IN_APP', 'EMAIL', 'SMS', 'PUSH') | No | 'IN_APP' | Dispatch channel |
| `created_at` | TIMESTAMP | No | CURRENT_TIMESTAMP | Record creation timestamp |
| `read_at` | DATETIME | Yes | NULL | Timestamp when read |

#### 3. Constraints
- **Primary Key:** `PRIMARY KEY (notification_id)`
- **Foreign Key:** `FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE`

#### 4. Primary Key
- `notification_id` (BIGINT AUTO_INCREMENT)

#### 5. Foreign Keys
- `user_id` → References `users(user_id)`

#### 6. Indexes
- `PRIMARY KEY (notification_id)`
- `INDEX idx_notifications_user_id (user_id)`
- `INDEX idx_notifications_status (status)`
- `INDEX idx_notifications_type (notification_type)`
- `INDEX idx_notifications_user_status (user_id, status)`

#### 7. Relationships
- Belongs to `users`.

#### 8. Business Rules
- Notifications are never deleted by users. Read status updates `status = 'READ'` and `read_at`.

#### 9. Scalability Notes
- Composite index `(user_id, status)` optimizes unread badge counts.

#### 10. Future Considerations
- Push notification batching and preference overrides.

---

### TABLE 16: `audit_logs`

#### 1. Purpose
Stores system-wide security, operational, and transactional audit events for security compliance and debugging.

#### 2. Columns & Data Types
| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `audit_log_id` | BIGINT | No | AUTO_INCREMENT | Unique audit log primary key |
| `user_id` | BIGINT | Yes | NULL | Foreign key referencing `users.user_id` |
| `entity_name` | VARCHAR(100) | No | None | Target database table or entity |
| `entity_id` | BIGINT | No | None | Primary key of affected entity |
| `action` | VARCHAR(100) | No | None | Action performed (e.g. `CREATE`, `UPDATE`, `DELETE`) |
| `ip_address` | VARCHAR(45) | Yes | NULL | Client IP address |
| `user_agent` | TEXT | Yes | NULL | Client HTTP user agent string |
| `request_id` | VARCHAR(100) | Yes | NULL | Correlation ID tracing request |
| `description` | TEXT | Yes | NULL | Event summary |
| `created_at` | TIMESTAMP | No | CURRENT_TIMESTAMP | Timestamp created |

#### 3. Constraints
- **Primary Key:** `PRIMARY KEY (audit_log_id)`
- **Foreign Key:** `FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL`

#### 4. Primary Key
- `audit_log_id` (BIGINT AUTO_INCREMENT)

#### 5. Foreign Keys
- `user_id` → References `users(user_id)`

#### 6. Indexes
- `PRIMARY KEY (audit_log_id)`
- `INDEX idx_audit_logs_user_id (user_id)`
- `INDEX idx_audit_logs_entity_name (entity_name)`
- `INDEX idx_audit_logs_created_at (created_at)`

#### 7. Relationships
- Belongs to `users` (nullable).

#### 8. Business Rules
- Strictly append-only. Immutable log entries. `updated_at` column is intentionally omitted.

#### 9. Scalability Notes
- Mandatory RANGE partitioning by `created_at` (monthly partitions).

#### 10. Future Considerations
- JSON diff snapshot columns for row changes.

---

### TABLE 17: `decision_engine_configs`

#### 1. Purpose
Stores configuration hyperparameters and scoring weights for Decision Engine matching algorithm versions. Allows administrators to dynamically tune matching parameters without changing code.

#### 2. Columns & Data Types
| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `config_id` | BIGINT | No | AUTO_INCREMENT | Unique configuration primary key |
| `algorithm_version` | VARCHAR(20) | No | None | Algorithm version identifier |
| `distance_weight` | DECIMAL(5, 2) | No | 0.35 | Weight assigned to geographic distance proximity |
| `capacity_weight` | DECIMAL(5, 2) | No | 0.25 | Weight assigned to NGO remaining capacity |
| `expiry_weight` | DECIMAL(5, 2) | No | 0.25 | Weight assigned to food expiration urgency |
| `freshness_weight` | DECIMAL(5, 2) | No | 0.15 | Weight assigned to food preparation freshness |
| `is_active` | BOOLEAN | No | FALSE | Flag indicating active production configuration |
| `created_at` | TIMESTAMP | No | CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | No | CURRENT_TIMESTAMP ON UPDATE | Record last modification timestamp |

#### 3. Constraints
- **Primary Key:** `PRIMARY KEY (config_id)`
- **Unique Constraint:** `UNIQUE KEY uq_de_configs_version (algorithm_version)`
- **Check Constraint:** `CHECK (distance_weight + capacity_weight + expiry_weight + freshness_weight = 1.00)`

#### 4. Primary Key
- `config_id` (BIGINT AUTO_INCREMENT)

#### 5. Foreign Keys
- None

#### 6. Indexes
- `PRIMARY KEY (config_id)`
- `UNIQUE INDEX uq_de_configs_version (algorithm_version)`
- `INDEX idx_de_configs_active (is_active)`

#### 7. Relationships
- Read by Decision Engine service during recommendation runs.

#### 8. Business Rules
- Only one configuration record may have `is_active = TRUE` at any given time.
- The sum of weight parameters must equal 1.00 (100%).

#### 9. Scalability Notes
- Cached in Redis; reloaded automatically upon admin config updates.

#### 10. Future Considerations
- ML-driven dynamic weight optimization parameter tables.

---

## 3. Database-Wide Constraints Summary

### Referential Integrity & Foreign Keys
1. **Cascade Delete (`ON DELETE CASCADE`):**
   - Profile entity tables (`donors`, `ngos`, `volunteers`, `ngo_daily_capacity`) cascade delete when parent `users` or `ngos` record is deleted.
   - Child transactional tables (`donation_items`, `decision_engine_runs`, `recommendation_cycles`, `ngo_requests`, `volunteer_assignments`, `notifications`) cascade delete when their parent is deleted.
2. **Set Null (`ON DELETE SET NULL`):**
   - Audit trail and history tables (`donations.created_by_user_id`, `donation_status_history`, `ngo_request_history`, `assignment_history`, `audit_logs`) preserve records when `users` account is removed, setting `user_id` or `changed_by_user_id` / `created_by_user_id` to `NULL`.

### Unique Constraints Summary
- `users`: `UNIQUE (email)`
- `donors`: `UNIQUE (user_id)`
- `ngos`: `UNIQUE (user_id)`, `UNIQUE (registration_number)`
- `volunteers`: `UNIQUE (user_id)`
- `ngo_daily_capacity`: `UNIQUE (ngo_id, day_of_week)`
- `ngo_requests`: `UNIQUE (recommendation_cycle_id, recommendation_rank)`, `UNIQUE (recommendation_cycle_id, ngo_id)`
- `volunteer_assignments`: `UNIQUE (ngo_request_id, assignment_rank)`, `UNIQUE (ngo_request_id, volunteer_id)`
- `decision_engine_configs`: `UNIQUE (algorithm_version)`

---

## 4. Database Indexing Strategy & Rationale

| Index Name | Table | Columns | Technical Rationale |
| :--- | :--- | :--- | :--- |
| `uq_users_email` | `users` | `email` | Unique index optimizing authentication lookup queries (`WHERE email = ?`). |
| `uq_ngos_registration` | `ngos` | `registration_number` | Guarantees uniqueness for government NGO registration identifiers. |
| `idx_users_role` | `users` | `role` | Optimizes admin filtering of platform users by role classification. |
| `idx_donations_status` | `donations` | `status` | Accelerates Decision Engine polling queries for active `SUBMITTED` donations. |
| `idx_donations_status_expiry` | `donations` | `status, expiry_time` | Composite index for finding active non-expired donations (`status = 'SUBMITTED' AND expiry_time > NOW()`). |
| `idx_ngo_requests_status_deadline` | `ngo_requests` | `status, response_deadline` | Composite index for timeout background workers polling pending NGO requests. |
| `idx_vol_assign_status_deadline` | `volunteer_assignments` | `status, response_deadline` | Composite index for timeout background workers polling pending volunteer assignments. |
| `idx_donors_is_active` | `donors` | `is_active` | Rapidly filters active donor profiles. |
| `idx_ngos_is_active` | `ngos` | `is_active` | Rapidly filters active NGO profiles for Decision Engine candidate selection. |
| `idx_volunteers_is_active` | `volunteers` | `is_active` | Rapidly filters active volunteer profiles for dispatch. |
| `idx_notifications_user_status` | `notifications` | `user_id, status` | Composite covering index enabling instant unread badge counts on user dashboards. |

---

## 5. Soft Delete Policy

### Tables Supporting Soft Delete (`is_active` / `account_status`)
- **`users`**: Soft delete enforced via `account_status = 'INACTIVE'` or `account_status = 'SUSPENDED'`.
- **`donors`**, **`ngos`**, **`volunteers`**: Operational soft-delete flag `is_active = FALSE`. Profile data retained for historical reporting.

### Immutable Tables (Deletion Strictly Prohibited)
- **`donations`**: Closed via `status = 'COMPLETED'`, `'CANCELLED'`, or `'EXPIRED'`.
- **`decision_engine_runs`**, **`recommendation_cycles`**, **`ngo_requests`**, **`volunteer_assignments`**: Retained permanently for Decision Engine training analytics and SLA evaluation.
- **`donation_status_history`**, **`ngo_request_history`**, **`assignment_history`**, **`audit_logs`**: Append-only immutable logs. `updated_at` column is intentionally omitted. Hard deletion or inline updates are strictly prohibited.

---

## 6. Future Scalability Recommendations

### 1. Database Partitioning
- **Monthly RANGE Partitioning:** Apply to high-volume append-only logging tables (`audit_logs`, `decision_engine_runs`, `donation_status_history`, `ngo_request_history`, `assignment_history`, `notifications`) partitioned on `created_at` / `changed_at`.

### 2. Archiving Strategy
- Establish automated ETL cron workers to migrate closed decision runs and history logs older than 12 months to an Amazon S3 / Google Cloud Storage data lake in Parquet format for long-term analytical queries via BigQuery.

### 3. Spatial Indexing Plan
- Replace scalar `latitude`/`longitude` distance calculations in MySQL 8 with native `POINT` spatial data types (`location_point POINT SRID 4326`) and `SPATIAL INDEX` for sub-millisecond GIS proximity queries (`ST_Distance_Sphere`).

### 4. In-Memory Caching (Redis)
- Cache active volunteer telemetry, verified NGO profiles, and active decision engine configurations in Redis.

---

## 7. Appendix: System ENUM Catalog

Below is the complete dictionary of ENUM types used throughout the FoodBridge database schema:

| ENUM Name | Table(s) | Allowed Values |
| :--- | :--- | :--- |
| `UserRole` | `users` | `'DONOR'`, `'NGO'`, `'VOLUNTEER'`, `'ADMIN'` |
| `AccountStatus` | `users` | `'ACTIVE'`, `'PENDING'`, `'SUSPENDED'`, `'INACTIVE'` |
| `VerificationStatus` | `donors`, `ngos`, `volunteers` | `'VERIFIED'`, `'PENDING'`, `'REJECTED'` |
| `OperationalStatus` | `volunteers` | `'AVAILABLE'`, `'BUSY'`, `'OFFLINE'` |
| `CapacityStatus` | `ngo_daily_capacity` | `'ACTIVE'`, `'PAUSED'`, `'FULL'` |
| `DayOfWeek` | `ngo_daily_capacity` | `'MONDAY'`, `'TUESDAY'`, `'WEDNESDAY'`, `'THURSDAY'`, `'FRIDAY'`, `'SATURDAY'`, `'SUNDAY'` |
| `VehicleType` | `volunteers` | `'WALKING'`, `'BICYCLE'`, `'BIKE'`, `'SCOOTER'`, `'CAR'`, `'VAN'` |
| `QuantityUnit` | `donations`, `donation_items` | `'KG'`, `'GRAM'`, `'LITRE'`, `'ML'`, `'BOX'`, `'PACKET'`, `'PLATE'` |
| `DeliveryPreference` | `donations` | `'DONOR_DELIVERY'`, `'PICKUP_REQUIRED'` |
| `DonationStatus` | `donations`, `donation_status_history` | `'DRAFT'`, `'SUBMITTED'`, `'PENDING_NGO'`, `'NGO_ACCEPTED'`, `'VOLUNTEER_PENDING'`, `'PICKUP_IN_PROGRESS'`, `'DELIVERED'`, `'COMPLETED'`, `'EXPIRED'`, `'CANCELLED'` |
| `ItemCategory` | `donation_items` | `'RICE'`, `'CURRY'`, `'BREAD'`, `'VEGETABLE'`, `'FRUIT'`, `'SNACK'`, `'BEVERAGE'`, `'DESSERT'`, `'OTHER'` |
| `FoodType` | `donation_items` | `'VEGETARIAN'`, `'NON_VEGETARIAN'`, `'VEGAN'` |
| `ExecutionStatus` | `decision_engine_runs` | `'SUCCESS'`, `'FAILED'`, `'NO_CANDIDATES'`, `'TIMEOUT'` |
| `TriggerReason` | `recommendation_cycles` | `'NEW_DONATION'`, `'DONATION_UPDATED'`, `'MANUAL_RETRY'`, `'ADMIN_RETRY'` |
| `RequestStatus` | `ngo_requests`, `ngo_request_history` | `'PENDING'`, `'ACCEPTED'`, `'REJECTED'`, `'TIMED_OUT'`, `'AUTO_CANCELLED'` |
| `AssignmentStatus` | `volunteer_assignments`, `assignment_history` | `'PENDING'`, `'ACCEPTED'`, `'REJECTED'`, `'TIMED_OUT'`, `'AUTO_CANCELLED'` |
| `NotificationType` | `notifications` | `'DONATION_CREATED'`, `'NGO_REQUEST'`, `'VOLUNTEER_REQUEST'`, `'DONATION_ACCEPTED'`, `'DONATION_REJECTED'`, `'PICKUP_ASSIGNED'`, `'DELIVERY_COMPLETED'`, `'SYSTEM'` |
| `DeliveryChannel` | `notifications` | `'IN_APP'`, `'EMAIL'`, `'SMS'`, `'PUSH'` |
