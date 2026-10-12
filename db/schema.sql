-- =========================================================================
-- ShinkafiRide.ng - PostgreSQL Production DDL
-- Relational Database Schema for Shinkafi, Zamfara State, Nigeria
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('passenger', 'driver', 'operator', 'admin', 'security_officer')),
    is_verified BOOLEAN DEFAULT FALSE,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- 2. user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    preferred_language VARCHAR(50) DEFAULT 'Hausa / English',
    avatar_url TEXT,
    address TEXT,
    city VARCHAR(100) DEFAULT 'Shinkafi',
    state VARCHAR(100) DEFAULT 'Zamfara State',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. passenger_profiles
CREATE TABLE IF NOT EXISTS passenger_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(20),
    preferred_payment_method VARCHAR(20) DEFAULT 'cash',
    total_rides INTEGER DEFAULT 0,
    rating NUMERIC(3, 2) DEFAULT 5.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. operator_profiles
CREATE TABLE IF NOT EXISTS operator_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(200) NOT NULL,
    cac_number VARCHAR(50) UNIQUE NOT NULL,
    contact_person VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    business_address TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    total_vehicles INTEGER DEFAULT 0,
    commission_rate NUMERIC(4, 2) DEFAULT 15.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. driver_profiles
CREATE TABLE IF NOT EXISTS driver_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operator_id UUID REFERENCES users(id),
    license_number VARCHAR(50) UNIQUE NOT NULL,
    license_expiry DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'suspended')),
    reviewed_by UUID REFERENCES users(id),
    review_notes TEXT,
    review_date TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN DEFAULT FALSE,
    current_lat NUMERIC(10, 6) DEFAULT 13.0782,
    current_lng NUMERIC(10, 6) DEFAULT 6.5195,
    last_location_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_vehicle_id UUID,
    total_trips INTEGER DEFAULT 0,
    rating NUMERIC(3, 2) DEFAULT 5.00,
    total_earnings NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_driver_status ON driver_profiles(status);
CREATE INDEX idx_driver_online ON driver_profiles(is_online);

-- 6. driver_documents
CREATE TABLE IF NOT EXISTS driver_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    verification_status VARCHAR(30) DEFAULT 'pending',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID REFERENCES users(id),
    driver_id UUID REFERENCES users(id),
    make VARCHAR(80) NOT NULL,
    model VARCHAR(80) NOT NULL,
    year INTEGER NOT NULL,
    plate_number VARCHAR(30) UNIQUE NOT NULL,
    color VARCHAR(40) NOT NULL,
    category VARCHAR(40) NOT NULL CHECK (category IN ('sedan', 'keke_tricycle', 'intercity_van', 'cargo_pickup')),
    capacity INTEGER NOT NULL DEFAULT 4,
    status VARCHAR(30) DEFAULT 'active',
    insurance_expiry DATE NOT NULL,
    roadworthiness_expiry DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_vehicles_plate ON vehicles(plate_number);

-- 8. service_areas
CREATE TABLE IF NOT EXISTS service_areas (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    state VARCHAR(80) NOT NULL,
    center_lat NUMERIC(10, 6) NOT NULL,
    center_lng NUMERIC(10, 6) NOT NULL,
    radius_km INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    operating_hours VARCHAR(100) NOT NULL
);

-- 9. fare_rules
CREATE TABLE IF NOT EXISTS fare_rules (
    id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(40) UNIQUE NOT NULL,
    service_area VARCHAR(100) NOT NULL,
    base_fare NUMERIC(10, 2) NOT NULL,
    per_km_rate NUMERIC(10, 2) NOT NULL,
    per_minute_rate NUMERIC(10, 2) NOT NULL,
    minimum_fare NUMERIC(10, 2) NOT NULL,
    cancellation_fee NUMERIC(10, 2) NOT NULL,
    commission_percentage NUMERIC(4, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'NGN'
);

-- 10. rides
CREATE TABLE IF NOT EXISTS rides (
    id VARCHAR(64) PRIMARY KEY,
    passenger_id UUID NOT NULL REFERENCES users(id),
    driver_id UUID REFERENCES users(id),
    vehicle_id UUID REFERENCES vehicles(id),
    service_area_id VARCHAR(50) REFERENCES service_areas(id),
    category VARCHAR(40) NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_lat NUMERIC(10, 6) NOT NULL,
    pickup_lng NUMERIC(10, 6) NOT NULL,
    destination_address TEXT NOT NULL,
    dest_lat NUMERIC(10, 6) NOT NULL,
    dest_lng NUMERIC(10, 6) NOT NULL,
    estimated_distance_km NUMERIC(6, 2) NOT NULL,
    estimated_duration_min INTEGER NOT NULL,
    estimated_fare NUMERIC(10, 2) NOT NULL,
    final_fare NUMERIC(10, 2),
    platform_commission NUMERIC(10, 2) NOT NULL,
    net_driver_earnings NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(30) DEFAULT 'cash',
    payment_status VARCHAR(30) DEFAULT 'pending',
    verification_otp VARCHAR(6) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'requested',
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES users(id),
    passenger_rating INTEGER CHECK (passenger_rating BETWEEN 1 AND 5),
    passenger_feedback TEXT,
    driver_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    arrived_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_rides_passenger ON rides(passenger_id);
CREATE INDEX idx_rides_driver ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);

-- 11. ride_status_history
CREATE TABLE IF NOT EXISTS ride_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id VARCHAR(64) NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    from_status VARCHAR(32) NOT NULL,
    to_status VARCHAR(32) NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id VARCHAR(64) REFERENCES rides(id),
    user_id UUID NOT NULL REFERENCES users(id),
    provider VARCHAR(30) NOT NULL,
    reference VARCHAR(100) UNIQUE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'NGN',
    status VARCHAR(30) DEFAULT 'pending',
    channel VARCHAR(50),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_payments_reference ON payments(reference);

-- 13. transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(40) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. incidents
CREATE TABLE IF NOT EXISTS incidents (
    id VARCHAR(64) PRIMARY KEY,
    ticket_number VARCHAR(60) UNIQUE NOT NULL,
    ride_id VARCHAR(64) REFERENCES rides(id),
    reported_by_user_id UUID NOT NULL REFERENCES users(id),
    reported_role VARCHAR(32) NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(30) NOT NULL DEFAULT 'new',
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    assigned_officer_id UUID REFERENCES users(id),
    assigned_officer_name VARCHAR(150),
    escalated_to_police BOOLEAN DEFAULT FALSE,
    resolution_summary TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_status ON incidents(status);

-- 15. incident_notes
CREATE TABLE IF NOT EXISTS incident_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id VARCHAR(64) NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    author_name VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    user_role VARCHAR(32) NOT NULL,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
