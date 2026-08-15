-- ====================================================================
-- SynthDB Sample: Mutual Cyclic FKs & Self-Referential Graph
-- ====================================================================

CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    manager_id INTEGER, -- Circular reference to employees.id
    budget DECIMAL(12, 2) DEFAULT 500000.00,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL REFERENCES departments(id),
    reports_to_id INTEGER REFERENCES employees(id), -- Self-referential hierarchy
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    job_title VARCHAR(100) NOT NULL,
    salary DECIMAL(10, 2) NOT NULL,
    hired_at TIMESTAMP WITH TIME ZONE
);

-- Add mutual circular FK from departments to employees
ALTER TABLE departments ADD CONSTRAINT fk_dept_manager FOREIGN KEY (manager_id) REFERENCES employees(id);
