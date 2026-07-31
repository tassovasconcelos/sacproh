-- ==========================================
-- GRIT SAC 4.0 - PostgreSQL Schema & Migration
-- Multi-Tenant Customer Service, Quality, Logistics & Tech Support
-- ==========================================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. ORGANIZATIONAL STRUCTURE
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    document VARCHAR(20) NOT NULL UNIQUE, -- CNPJ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role_code VARCHAR(50) NOT NULL REFERENCES roles(code),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_access_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CADASTROS (CUSTOMERS & PRODUCTS)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('PF', 'PJ', 'CLINIC', 'HOSPITAL')),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    document VARCHAR(20) NOT NULL, -- CPF/CNPJ
    email VARCHAR(255),
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    address TEXT,
    lgpd_consent BOOLEAN DEFAULT FALSE,
    lgpd_consent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, document)
);

CREATE TABLE product_families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    family_id UUID REFERENCES product_families(id),
    code_sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(100),
    anvisa_register VARCHAR(100),
    supplier_name VARCHAR(255),
    country_origin VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code_sku)
);

-- 3. PROTOCOL SEQUENCER & SAC TICKETS
CREATE TABLE ticket_sequences (
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    year_month VARCHAR(4) NOT NULL, -- e.g. 2607
    last_value INT DEFAULT 0,
    PRIMARY KEY (tenant_id, year_month)
);

-- Protocol Function (Atomic & Transactional)
CREATE OR REPLACE FUNCTION generate_ticket_protocol(p_tenant_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_ym VARCHAR(4);
    v_seq INT;
    v_protocol VARCHAR(20);
BEGIN
    v_ym := TO_CHAR(CURRENT_DATE, 'YYMM');
    
    INSERT INTO ticket_sequences (tenant_id, year_month, last_value)
    VALUES (p_tenant_id, v_ym, 1)
    ON CONFLICT (tenant_id, year_month)
    DO UPDATE SET last_value = ticket_sequences.last_value + 1
    RETURNING last_value INTO v_seq;

    v_protocol := 'SAC.' || v_ym || '.' || LPAD(v_seq::TEXT, 3, '0');
    RETURN v_protocol;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    protocol VARCHAR(30) NOT NULL UNIQUE,
    unit_id UUID REFERENCES units(id),
    customer_id UUID REFERENCES customers(id),
    
    -- Commercial Context
    seller_name VARCHAR(255),
    invoice_number VARCHAR(100),
    purchase_date DATE,
    delivery_date DATE,
    sales_channel VARCHAR(100),
    
    -- Occurrence Details
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    classification VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    urgency VARCHAR(20) DEFAULT 'MEDIUM',
    impact VARCHAR(20) DEFAULT 'MEDIUM',
    initial_procedency VARCHAR(30) DEFAULT 'UNDETERMINED',
    
    -- Quality Risk & Anvisa
    user_risk_flag BOOLEAN DEFAULT FALSE,
    adverse_event_flag BOOLEAN DEFAULT FALSE,
    damage_flag BOOLEAN DEFAULT FALSE,
    ready_for_collection BOOLEAN DEFAULT FALSE,
    
    -- Status & Lifecycle
    status VARCHAR(50) DEFAULT 'NEW' NOT NULL,
    assigned_to UUID REFERENCES profiles(id),
    assigned_area VARCHAR(100),
    
    -- SLA Tracking
    sla_due_at TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    -- Final Resolution & Opinion
    final_opinion TEXT,
    final_procedency VARCHAR(30), -- PROCEDENT / NON_PROCEDENT / CANCELLED
    
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ticket_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    quantity INT DEFAULT 1,
    serial_number VARCHAR(100),
    lot_number VARCHAR(100),
    expiration_date DATE,
    anvisa_register VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ticket_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES profiles(id),
    changed_by_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ticket_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id),
    author_name VARCHAR(255) NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ticket_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INT,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. QUALITY & ACTION PLANS (5W2H)
CREATE TABLE root_causes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50),
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE action_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    root_cause TEXT,
    what_action TEXT NOT NULL,
    why_reason TEXT,
    where_location VARCHAR(255),
    when_deadline DATE,
    who_responsible VARCHAR(255),
    how_method TEXT,
    how_much_cost NUMERIC(12,2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TECHNICAL ASSISTANCE & LOGISTICS
CREATE TABLE technical_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    subprotocol VARCHAR(35) UNIQUE, -- e.g. SAC.2607.001-AT01
    technician_id UUID REFERENCES profiles(id),
    diagnostic_report TEXT,
    replaced_parts TEXT,
    visit_date TIMESTAMPTZ,
    status VARCHAR(30) DEFAULT 'IN_ANALYSIS',
    cost NUMERIC(10,2) DEFAULT 0.00,
    customer_signature_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE logistics_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    subprotocol VARCHAR(35) UNIQUE, -- e.g. SAC.2607.001-LOG01
    carrier_name VARCHAR(255),
    tracking_code VARCHAR(100),
    type VARCHAR(30) CHECK (type IN ('COLLECTION', 'RETURN', 'SHIPMENT')),
    freight_cost NUMERIC(10,2) DEFAULT 0.00,
    scheduled_date DATE,
    completed_date DATE,
    status VARCHAR(30) DEFAULT 'SCHEDULED',
    proof_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SATISFACTION SURVEYS (NPS)
CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    nps_score INT CHECK (nps_score BETWEEN 0 AND 10),
    satisfaction_level VARCHAR(20),
    speed_rating INT,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AUDIT LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper RLS function
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
    SELECT (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'tenant_id')::uuid;
$$ LANGUAGE sql STABLE;

-- Generic Tenant Isolation Policy Example
CREATE POLICY tenant_isolation_tickets ON tickets
    FOR ALL
    USING (tenant_id = current_tenant_id() OR (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role_code') = 'SUPERADMIN');

CREATE POLICY tenant_isolation_customers ON customers
    FOR ALL
    USING (tenant_id = current_tenant_id() OR (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role_code') = 'SUPERADMIN');

CREATE POLICY tenant_isolation_products ON products
    FOR ALL
    USING (tenant_id = current_tenant_id() OR (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role_code') = 'SUPERADMIN');
