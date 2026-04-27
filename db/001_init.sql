-- Community Aid Platform - Database Schema Migration
-- Run this file to set up all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- ENUM TYPES
-- ==========================================

CREATE TYPE user_role AS ENUM ('volunteer', 'ngo_admin', 'super_admin');
CREATE TYPE need_category AS ENUM ('education', 'medical', 'water', 'food', 'shelter', 'plumbing', 'other');
CREATE TYPE need_status AS ENUM ('open', 'assigned', 'in_progress', 'resolved');
CREATE TYPE task_status AS ENUM ('assigned', 'accepted', 'in_progress', 'completed', 'cancelled');

-- ==========================================
-- USERS TABLE
-- ==========================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'volunteer',
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ==========================================
-- ORGANIZATIONS TABLE
-- ==========================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    contact_email VARCHAR(255),
    api_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orgs_api_key ON organizations(api_key);

-- ==========================================
-- VOLUNTEERS TABLE
-- ==========================================

CREATE TABLE volunteers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skills TEXT[] DEFAULT '{}',
    home_lat DOUBLE PRECISION,
    home_lng DOUBLE PRECISION,
    max_radius_km DOUBLE PRECISION DEFAULT 25.0,
    availability JSONB DEFAULT '{}',
    languages TEXT[] DEFAULT '{English}',
    trust_score DOUBLE PRECISION DEFAULT 50.0,
    active_task_count INTEGER DEFAULT 0,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_volunteers_user_id ON volunteers(user_id);
CREATE INDEX idx_volunteers_skills ON volunteers USING GIN(skills);
CREATE INDEX idx_volunteers_location ON volunteers(home_lat, home_lng);

-- ==========================================
-- NEEDS TABLE
-- ==========================================

CREATE TABLE needs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category need_category NOT NULL DEFAULT 'other',
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    area_name VARCHAR(255),
    urgency_score DOUBLE PRECISION DEFAULT 0.0,
    severity INTEGER DEFAULT 1 CHECK (severity >= 1 AND severity <= 5),
    num_people_affected INTEGER DEFAULT 1,
    time_sensitive BOOLEAN DEFAULT false,
    vulnerability_score DOUBLE PRECISION DEFAULT 0.0,
    status need_status DEFAULT 'open',
    source_org VARCHAR(255),
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_needs_status ON needs(status);
CREATE INDEX idx_needs_category ON needs(category);
CREATE INDEX idx_needs_urgency ON needs(urgency_score DESC);
CREATE INDEX idx_needs_location ON needs(location_lat, location_lng);
CREATE INDEX idx_needs_reported_by ON needs(reported_by);
CREATE INDEX idx_needs_created_at ON needs(created_at DESC);

-- ==========================================
-- TASKS TABLE
-- ==========================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    need_id UUID NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    status task_status DEFAULT 'assigned',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    deadline TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tasks_need_id ON tasks(need_id);
CREATE INDEX idx_tasks_volunteer_id ON tasks(volunteer_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- ==========================================
-- MATCHES TABLE
-- ==========================================

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    need_id UUID NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    match_score DOUBLE PRECISION DEFAULT 0.0,
    distance_km DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_matches_need_id ON matches(need_id);
CREATE INDEX idx_matches_volunteer_id ON matches(volunteer_id);
CREATE INDEX idx_matches_score ON matches(match_score DESC);

-- ==========================================
-- NOTIFICATIONS TABLE (for tracking)
-- ==========================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- ==========================================
-- REFRESH TOKENS TABLE
-- ==========================================

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- ==========================================
-- TRIGGER: Update updated_at automatically
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_volunteers_updated_at BEFORE UPDATE ON volunteers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_needs_updated_at BEFORE UPDATE ON needs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orgs_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
