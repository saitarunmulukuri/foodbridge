-- ==============================================================================
-- FoodBridge – Intelligent Food Waste Redistribution Platform
-- Database Schema Definition (MySQL 8.0+)
-- Storage Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS foodbridge_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE foodbridge_db;

-- Disable foreign key checks during schema creation
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- TABLE 1: users
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    user_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('DONOR', 'NGO', 'VOLUNTEER', 'ADMIN') NOT NULL,
    account_status ENUM('ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE') NOT NULL DEFAULT 'PENDING',
    last_login DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_email UNIQUE (email),
    INDEX idx_users_role (role),
    INDEX idx_users_account_status (account_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- TABLE 2: donors
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS donors;
CREATE TABLE donors (
    donor_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    organisation_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    verification_status ENUM('VERIFIED', 'PENDING', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_donors_user_id UNIQUE (user_id),
    CONSTRAINT fk_donors_user_id FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_donors_verification_status (verification_status),
    INDEX idx_donors_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- TABLE 3: ngos
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS ngos;
CREATE TABLE ngos (
    ngo_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    organisation_name VARCHAR(200) NOT NULL,
    registration_number VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    service_radius_km INT NOT NULL DEFAULT 15,
    verification_status ENUM('VERIFIED', 'PENDING', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_ngos_user_id UNIQUE (user_id),
    CONSTRAINT uq_ngos_registration_number UNIQUE (registration_number),
    CONSTRAINT fk_ngos_user_id FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_ngos_service_radius CHECK (service_radius_km > 0),
    INDEX idx_ngos_service_radius (service_radius_km),
    INDEX idx_ngos_verification_status (verification_status),
    INDEX idx_ngos_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- TABLE 4: ngo_daily_capacity
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS ngo_daily_capacity;
CREATE TABLE ngo_daily_capacity (
    capacity_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ngo_id BIGINT NOT NULL,
    day_of_week ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,
    max_meals INT NOT NULL DEFAULT 0,
    remaining_capacity INT NOT NULL DEFAULT 0,
    status ENUM('ACTIVE', 'PAUSED', 'FULL') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_ngo_daily_capacity UNIQUE (ngo_id, day_of_week),
    CONSTRAINT fk_ngo_capacity_ngo_id FOREIGN KEY (ngo_id) REFERENCES ngos (ngo_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_ngo_capacity_max_meals CHECK (max_meals >= 0),
    CONSTRAINT chk_ngo_capacity_remaining CHECK (remaining_capacity >= 0),
    INDEX idx_ngo_capacity_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- TABLE 5: volunteers
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS volunteers;
CREATE TABLE volunteers (
    volunteer_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    vehicle_type ENUM('WALKING', 'BICYCLE', 'BIKE', 'SCOOTER', 'CAR', 'VAN') NOT NULL,
    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,
    operational_status ENUM('AVAILABLE', 'BUSY', 'OFFLINE') NOT NULL DEFAULT 'OFFLINE',
    verification_status ENUM('VERIFIED', 'PENDING', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_volunteers_user_id UNIQUE (user_id),
    CONSTRAINT fk_volunteers_user_id FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_volunteers_operational_status (operational_status),
    INDEX idx_volunteers_verification_status (verification_status),
    INDEX idx_volunteers_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- TABLE 6: donations
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS donations;
CREATE TABLE donations (
    donation_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    donor_id BIGINT NOT NULL,
    created_by_user_id BIGINT NULL,
    donation_title VARCHAR(150) NOT NULL,
    description TEXT NULL,
    prepared_time DATETIME NULL,
    available_from DATETIME NOT NULL,
    expiry_time DATETIME NOT NULL,
    total_quantity DECIMAL(10, 2) NOT NULL,
    quantity_unit ENUM('KG', 'GRAM', 'LITRE', 'ML', 'BOX', 'PACKET', 'PLATE') NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_landmark VARCHAR(200) NULL,
    pickup_city VARCHAR(100) NOT NULL,
    pickup_state VARCHAR(100) NOT NULL,
    pickup_postal_code VARCHAR(20) NOT NULL,
    pickup_latitude DECIMAL(10, 7) NOT NULL,
    pickup_longitude DECIMAL(10, 7) NOT NULL,
    delivery_preference ENUM('DONOR_DELIVERY', 'PICKUP_REQUIRED') NOT NULL DEFAULT 'PICKUP_REQUIRED',
    status ENUM('DRAFT', 'SUBMITTED', 'PENDING_NGO', 'NGO_ACCEPTED', 'VOLUNTEER_PENDING', 'PICKUP_IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    special_instructions TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_donations_donor_id FOREIGN KEY (donor_id) REFERENCES donors (donor_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_donations_created_by_user_id FOREIGN KEY (created_by_user_id) REFERENCES users (user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_donations_donor_id (donor_id),
    INDEX idx_donations_created_by (created_by_user_id),
    INDEX idx_donations_status (status),
    INDEX idx_donations_expiry_time (expiry_time),
    INDEX idx_donations_available_from (available_from),
    INDEX idx_donations_pickup_city (pickup_city),
    INDEX idx_donations_status_expiry (status, expiry_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- TABLE 7: donation_items
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS donation_items;
CREATE TABLE donation_items (
    item_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    donation_id BIGINT NOT NULL,
    item_name VARCHAR(150) NOT NULL,
    category ENUM('RICE', 'CURRY', 'BREAD', 'VEGETABLE', 'FRUIT', 'SNACK', 'BEVERAGE', 'DESSERT', 'OTHER') NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit ENUM('KG', 'GRAM', 'LITRE', 'ML', 'BOX', 'PACKET', 'PLATE') NOT NULL,
    food_type ENUM('VEGETARIAN', 'NON_VEGETARIAN', 'VEGAN') NOT NULL,
    contains_allergens BOOLEAN NOT NULL DEFAULT FALSE,
    allergen_details TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_donation_items_donation_id FOREIGN KEY (donation_id) REFERENCES donations (donation_id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_donation_items_donation_id (donation_id),
    INDEX idx_donation_items_category (category),
    INDEX idx_donation_items_food_type (food_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- TABLE 8: decision_engine_runs
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS decision_engine_runs;
CREATE TABLE decision_engine_runs (
    decision_engine_run_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    donation_id BIGINT NOT NULL,
    algorithm_version VARCHAR(20) NOT NULL,
    execution_status ENUM('SUCCESS', 'FAILED', 'NO_CANDIDATES', 'TIMEOUT') NOT NULL,
    started_at DATETIME NOT NULL,
    completed_at DATETIME NULL,
    execution_time_ms INT NULL,
    failure_reason TEXT NULL,
    ranking_snapshot JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_de_runs_donation_id FOREIGN KEY (donation_id) REFERENCES donations (donation_id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_de_runs_donation_id (donation_id),
    INDEX idx_de_runs_status (execution_status),
    INDEX idx_de_runs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- TABLE 9: recommendation_cycles
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS recommendation_cycles;
CREATE TABLE recommendation_cycles (
    recommendation_cycle_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    donation_id BIGINT NOT NULL,
    decision_engine_run_id BIGINT NOT NULL,
    algorithm_version VARCHAR(20) NOT NULL,
    trigger_reason ENUM('NEW_DONATION', 'DONATION_UPDATED', 'MANUAL_RETRY', 'ADMIN_RETRY') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rec_cycles_donation_id FOREIGN KEY (donation_id) REFERENCES donations (donation_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_rec_cycles_de_run_id FOREIGN KEY (decision_engine_run_id) REFERENCES decision_engine_runs (decision_engine_run_id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_recommendation_cycles_donation_id (donation_id),
    INDEX idx_recommendation_cycles_run_id (decision_engine_run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- TABLE 10: ngo_requests
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS ngo_requests;
CREATE TABLE ngo_requests (
    ngo_request_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recommendation_cycle_id BIGINT NOT NULL,
    ngo_id BIGINT NOT NULL,
    recommendation_rank INT NOT NULL,
    recommendation_score DECIMAL(6, 2) NOT NULL,
    response_deadline DATETIME NOT NULL,
    responded_at DATETIME NULL,
    status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'TIMED_OUT', 'AUTO_CANCELLED') NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_ngo_requests_cycle_rank UNIQUE (recommendation_cycle_id, recommendation_rank),
    CONSTRAINT uq_ngo_requests_cycle_ngo UNIQUE (recommendation_cycle_id, ngo_id),
    CONSTRAINT fk_ngo_requests_cycle_id FOREIGN KEY (recommendation_cycle_id) REFERENCES recommendation_cycles (recommendation_cycle_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ngo_requests_ngo_id FOREIGN KEY (ngo_id) REFERENCES ngos (ngo_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_ngo_req_score CHECK (recommendation_score >= 0.00 AND recommendation_score <= 100.00),
    INDEX idx_ngo_requests_cycle_id (recommendation_cycle_id),
    INDEX idx_ngo_requests_ngo_id (ngo_id),
    INDEX idx_ngo_requests_status (status),
    INDEX idx_ngo_requests_status_deadline (status, response_deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- TABLE 11: volunteer_assignments
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS volunteer_assignments;
CREATE TABLE volunteer_assignments (
    assignment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ngo_request_id BIGINT NOT NULL,
    volunteer_id BIGINT NOT NULL,
    assignment_rank INT NOT NULL,
    assignment_score DECIMAL(6, 2) NOT NULL,
    response_deadline DATETIME NOT NULL,
    responded_at DATETIME NULL,
    status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'TIMED_OUT', 'AUTO_CANCELLED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_vol_assign_req_rank UNIQUE (ngo_request_id, assignment_rank),
    CONSTRAINT uq_vol_assign_req_vol UNIQUE (ngo_request_id, volunteer_id),
    CONSTRAINT fk_vol_assign_req_id FOREIGN KEY (ngo_request_id) REFERENCES ngo_requests (ngo_request_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_vol_assign_vol_id FOREIGN KEY (volunteer_id) REFERENCES volunteers (volunteer_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_vol_assign_score CHECK (assignment_score >= 0.00 AND assignment_score <= 100.00),
    INDEX idx_volunteer_assignments_request_id (ngo_request_id),
    INDEX idx_volunteer_assignments_volunteer_id (volunteer_id),
    INDEX idx_volunteer_assignments_status (status),
    INDEX idx_vol_assign_status_deadline (status, response_deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- TABLE 12: donation_status_history
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS donation_status_history;
CREATE TABLE donation_status_history (
    donation_status_history_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    donation_id BIGINT NOT NULL,
    previous_status ENUM('DRAFT', 'SUBMITTED', 'PENDING_NGO', 'NGO_ACCEPTED', 'VOLUNTEER_PENDING', 'PICKUP_IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'EXPIRED', 'CANCELLED') NULL,
    new_status ENUM('DRAFT', 'SUBMITTED', 'PENDING_NGO', 'NGO_ACCEPTED', 'VOLUNTEER_PENDING', 'PICKUP_IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'EXPIRED', 'CANCELLED') NOT NULL,
    changed_by_user_id BIGINT NULL,
    change_reason TEXT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_don_stat_hist_don_id FOREIGN KEY (donation_id) REFERENCES donations (donation_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_don_stat_hist_user_id FOREIGN KEY (changed_by_user_id) REFERENCES users (user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_donation_status_history_donation_id (donation_id),
    INDEX idx_donation_status_history_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- TABLE 13: ngo_request_history
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS ngo_request_history;
CREATE TABLE ngo_request_history (
    ngo_request_history_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ngo_request_id BIGINT NOT NULL,
    previous_status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'TIMED_OUT', 'AUTO_CANCELLED') NULL,
    new_status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'TIMED_OUT', 'AUTO_CANCELLED') NOT NULL,
    changed_by_user_id BIGINT NULL,
    change_reason TEXT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ngo_req_hist_req_id FOREIGN KEY (ngo_request_id) REFERENCES ngo_requests (ngo_request_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ngo_req_hist_user_id FOREIGN KEY (changed_by_user_id) REFERENCES users (user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_ngo_request_history_request_id (ngo_request_id),
    INDEX idx_ngo_request_history_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- TABLE 14: assignment_history
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS assignment_history;
CREATE TABLE assignment_history (
    assignment_history_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    assignment_id BIGINT NOT NULL,
    previous_status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'TIMED_OUT', 'AUTO_CANCELLED') NULL,
    new_status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'TIMED_OUT', 'AUTO_CANCELLED') NOT NULL,
    changed_by_user_id BIGINT NULL,
    change_reason TEXT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assign_hist_assign_id FOREIGN KEY (assignment_id) REFERENCES volunteer_assignments (assignment_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_assign_hist_user_id FOREIGN KEY (changed_by_user_id) REFERENCES users (user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_assignment_history_assignment_id (assignment_id),
    INDEX idx_assignment_history_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- TABLE 15: notifications
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
    notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    notification_type ENUM('DONATION_CREATED', 'NGO_REQUEST', 'VOLUNTEER_REQUEST', 'DONATION_ACCEPTED', 'DONATION_REJECTED', 'PICKUP_ASSIGNED', 'DELIVERY_COMPLETED', 'SYSTEM') NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('UNREAD', 'READ') NOT NULL DEFAULT 'UNREAD',
    delivery_channel ENUM('IN_APP', 'EMAIL', 'SMS', 'PUSH') NOT NULL DEFAULT 'IN_APP',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME NULL,
    CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_status (status),
    INDEX idx_notifications_type (notification_type),
    INDEX idx_notifications_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- TABLE 16: audit_logs
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
    audit_log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    request_id VARCHAR(100) NULL,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_audit_logs_user_id (user_id),
    INDEX idx_audit_logs_entity_name (entity_name),
    INDEX idx_audit_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- TABLE 17: decision_engine_configs
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS decision_engine_configs;
CREATE TABLE decision_engine_configs (
    config_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    algorithm_version VARCHAR(20) NOT NULL,
    distance_weight DECIMAL(5, 2) NOT NULL DEFAULT 0.35,
    capacity_weight DECIMAL(5, 2) NOT NULL DEFAULT 0.25,
    expiry_weight DECIMAL(5, 2) NOT NULL DEFAULT 0.25,
    freshness_weight DECIMAL(5, 2) NOT NULL DEFAULT 0.15,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_de_configs_version UNIQUE (algorithm_version),
    INDEX idx_de_configs_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
