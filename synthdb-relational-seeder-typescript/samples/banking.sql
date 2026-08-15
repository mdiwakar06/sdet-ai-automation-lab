-- ====================================================================
-- SynthDB Sample: Composite Primary Keys & Banking Ledger DDL
-- ====================================================================

CREATE TABLE branches (
    branch_code VARCHAR(10) PRIMARY KEY,
    branch_name VARCHAR(100) NOT NULL,
    swift_bic VARCHAR(20) NOT NULL,
    city VARCHAR(80) NOT NULL,
    country VARCHAR(50) DEFAULT 'USA'
);

CREATE TABLE accounts (
    branch_code VARCHAR(10) NOT NULL REFERENCES branches(branch_code),
    account_no VARCHAR(20) NOT NULL,
    account_type VARCHAR(30) DEFAULT 'checking',
    currency VARCHAR(5) DEFAULT 'USD',
    balance DECIMAL(15, 2) NOT NULL DEFAULT 1000.00 CHECK (balance >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    opened_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT pk_accounts PRIMARY KEY (branch_code, account_no)
);

CREATE TABLE debit_cards (
    card_number VARCHAR(30) PRIMARY KEY,
    branch_code VARCHAR(10) NOT NULL,
    account_no VARCHAR(20) NOT NULL,
    cvv VARCHAR(5) NOT NULL,
    cardholder_name VARCHAR(120) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    daily_limit DECIMAL(10, 2) DEFAULT 2000.00,
    issued_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_cards_account FOREIGN KEY (branch_code, account_no) REFERENCES accounts(branch_code, account_no)
);

CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    branch_code VARCHAR(10) NOT NULL,
    account_no VARCHAR(20) NOT NULL,
    transaction_type VARCHAR(30) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    running_balance DECIMAL(15, 2) NOT NULL,
    reference_no VARCHAR(60) NOT NULL UNIQUE,
    transacted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_trans_account FOREIGN KEY (branch_code, account_no) REFERENCES accounts(branch_code, account_no)
);
