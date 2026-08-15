-- ====================================================================
-- SynthDB Sample: Deep 7-Level Multi-Tenant SaaS Hierarchy
-- ====================================================================

CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    subdomain VARCHAR(80) NOT NULL UNIQUE,
    subscription_tier VARCHAR(50) DEFAULT 'pro',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    tax_identifier VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE workspaces (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE saas_users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE team_memberships (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES saas_users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'contributor',
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    lead_user_id INTEGER NOT NULL REFERENCES saas_users(id),
    name VARCHAR(150) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    budget DECIMAL(12, 2) DEFAULT 10000.00,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assigned_user_id INTEGER REFERENCES saas_users(id),
    title VARCHAR(255) NOT NULL,
    priority VARCHAR(30) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'todo',
    estimated_hours DECIMAL(5, 2) DEFAULT 8.0,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE time_logs (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES saas_users(id),
    hours_logged DECIMAL(4, 2) NOT NULL,
    notes TEXT,
    logged_at TIMESTAMP WITH TIME ZONE
);
