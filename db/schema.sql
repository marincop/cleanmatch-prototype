-- CleanMatch O2O Platform - PostgreSQL Database Schema
-- Requires PostGIS extension for geo-spatial queries

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('CUSTOMER', 'CLEANER', 'ADMIN')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Cleaner Profiles Table
CREATE TABLE cleaner_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    cleaner_type VARCHAR(20) NOT NULL CHECK (cleaner_type IN ('INDIVIDUAL', 'AGENCY')),
    business_name VARCHAR(150),
    tax_id VARCHAR(20),
    id_card_encrypted TEXT,
    police_record_url TEXT,
    service_radius_km INT NOT NULL DEFAULT 10,
    service_location GEOMETRY(Point, 4326),
    avg_rating DECIMAL(3, 2) NOT NULL DEFAULT 5.00,
    total_orders_completed INT NOT NULL DEFAULT 0,
    verified_status VARCHAR(20) NOT NULL DEFAULT 'UNVERIFIED' CHECK (verified_status IN ('UNVERIFIED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'))
);

-- Create GiST Spatial Index on cleaner profile service location
CREATE INDEX idx_cleaners_location ON cleaner_profiles USING GIST (service_location);

-- 3. Agency Staff Table
CREATE TABLE agency_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES cleaner_profiles(id) ON DELETE CASCADE,
    staff_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_agency VARCHAR(20) NOT NULL DEFAULT 'WORKER' CHECK (role_in_agency IN ('MANAGER', 'WORKER')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'INACTIVE'))
);

-- 4. Customer Addresses Table
CREATE TABLE customer_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(20) NOT NULL CHECK (category IN ('RESIDENTIAL', 'OFFICE')),
    contact_name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    city VARCHAR(50) NOT NULL,
    district VARCHAR(50) NOT NULL,
    street_address VARCHAR(255) NOT NULL,
    building_has_elevator BOOLEAN NOT NULL DEFAULT TRUE,
    parking_info VARCHAR(100),
    geo_location GEOMETRY(Point, 4326) NOT NULL
);

-- Create GiST Spatial Index on customer address geo_location
CREATE INDEX idx_addresses_location ON customer_addresses USING GIST (geo_location);

-- 5. Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_no VARCHAR(32) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES users(id),
    cleaner_id UUID REFERENCES cleaner_profiles(id),
    assigned_staff_id UUID REFERENCES users(id),
    address_id UUID NOT NULL REFERENCES customer_addresses(id),
    booking_type VARCHAR(20) NOT NULL CHECK (booking_type IN ('INSTANT_FIXED', 'CUSTOM_BIDDING')),
    service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('HOME_GENERAL', 'DEEP_CLEAN', 'OFFICE', 'MOVE_IN_OUT')),
    space_size_ping INT NOT NULL,
    scheduled_start_at TIMESTAMPTZ NOT NULL,
    estimated_duration_hours DECIMAL(3, 1),
    total_amount DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) NOT NULL,
    cleaner_payout DECIMAL(10, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_MATCH' CHECK (status IN (
        'DRAFT', 'PENDING_MATCH', 'CANCELLED', 'ACCEPTED', 
        'EN_ROUTE', 'IN_PROGRESS', 'PENDING_APPROVAL', 
        'COMPLETED', 'DISPUTED', 'REFUNDED', 'SETTLED'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Order Items Table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL
);

-- 7. Cleaner Schedules Table
CREATE TABLE cleaner_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cleaner_id UUID NOT NULL REFERENCES cleaner_profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BOOKED', 'UNAVAILABLE')),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    CONSTRAINT chk_schedule_times CHECK (start_time < end_time)
);

-- 8. Quotation Bids Table
CREATE TABLE quotation_bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    cleaner_id UUID NOT NULL REFERENCES cleaner_profiles(id) ON DELETE CASCADE,
    bid_amount DECIMAL(10, 2) NOT NULL,
    proposed_duration_hours DECIMAL(3, 1) NOT NULL,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    payment_gateway VARCHAR(30) NOT NULL,
    gateway_transaction_id VARCHAR(100),
    auth_amount DECIMAL(10, 2) NOT NULL,
    captured_amount DECIMAL(10, 2),
    status VARCHAR(20) NOT NULL CHECK (status IN ('AUTHORIZED', 'PAID', 'REFUNDED', 'FAILED')),
    invoice_number VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Service Proof Photos Table
CREATE TABLE service_proof_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    photo_phase VARCHAR(20) NOT NULL CHECK (photo_phase IN ('BEFORE_CLEANING', 'AFTER_CLEANING')),
    area_tag VARCHAR(50) NOT NULL,
    photo_url TEXT NOT NULL,
    captured_lat_lng GEOMETRY(Point, 4326),
    client_signed_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Reviews Table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewee_id UUID NOT NULL REFERENCES users(id),
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    punctuality_score SMALLINT CHECK (punctuality_score BETWEEN 1 AND 5),
    cleanliness_score SMALLINT CHECK (cleanliness_score BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
