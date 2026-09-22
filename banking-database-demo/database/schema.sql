CREATE DATABASE IF NOT EXISTS banking_demo;
USE banking_demo;

CREATE TABLE customers (
    customer_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accounts (
    account_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,
    account_number CHAR(10) NOT NULL UNIQUE,
    account_type ENUM('checking', 'savings') NOT NULL,
    balance DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    status ENUM('active', 'frozen', 'closed') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_accounts_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT chk_accounts_balance CHECK (balance >= 0),
    INDEX idx_accounts_customer (customer_id),
    INDEX idx_accounts_status (status)
);

CREATE TABLE transactions (
    transaction_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    from_account_id BIGINT UNSIGNED NULL,
    to_account_id BIGINT UNSIGNED NULL,
    amount DECIMAL(14, 2) NOT NULL,
    transaction_type ENUM('deposit', 'withdrawal', 'transfer') NOT NULL,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transactions_from FOREIGN KEY (from_account_id) REFERENCES accounts(account_id),
    CONSTRAINT fk_transactions_to FOREIGN KEY (to_account_id) REFERENCES accounts(account_id),
    CONSTRAINT chk_transactions_amount CHECK (amount > 0),
    CONSTRAINT chk_transactions_accounts CHECK (from_account_id IS NOT NULL OR to_account_id IS NOT NULL),
    INDEX idx_transactions_created (created_at),
    INDEX idx_transactions_from (from_account_id),
    INDEX idx_transactions_to (to_account_id)
);

CREATE TABLE audit_log (
    audit_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_id BIGINT UNSIGNED NOT NULL,
    action_name VARCHAR(80) NOT NULL,
    result ENUM('success', 'rejected') NOT NULL,
    details VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id),
    INDEX idx_audit_created (created_at)
);

CREATE VIEW account_summary AS
SELECT
    a.account_id,
    a.account_number,
    c.full_name AS customer_name,
    a.account_type,
    a.balance,
    a.status
FROM accounts a
JOIN customers c ON c.customer_id = a.customer_id;

DELIMITER //

CREATE PROCEDURE transfer_funds(
    IN p_from_account BIGINT UNSIGNED,
    IN p_to_account BIGINT UNSIGNED,
    IN p_amount DECIMAL(14, 2),
    IN p_description VARCHAR(255)
)
BEGIN
    DECLARE v_from_balance DECIMAL(14, 2);
    DECLARE v_to_account BIGINT UNSIGNED;
    DECLARE v_transaction_id BIGINT UNSIGNED;

    START TRANSACTION;

    SELECT balance INTO v_from_balance
    FROM accounts
    WHERE account_id = p_from_account AND status = 'active'
    FOR UPDATE;

    SELECT account_id INTO v_to_account
    FROM accounts
    WHERE account_id = p_to_account AND status = 'active'
    FOR UPDATE;

    IF p_from_account = p_to_account OR p_amount <= 0 OR v_from_balance IS NULL OR v_from_balance < p_amount OR v_to_account IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transfer rejected: invalid account or insufficient funds';
    END IF;

    UPDATE accounts SET balance = balance - p_amount WHERE account_id = p_from_account;
    UPDATE accounts SET balance = balance + p_amount WHERE account_id = p_to_account AND status = 'active';

    INSERT INTO transactions (from_account_id, to_account_id, amount, transaction_type, description)
    VALUES (p_from_account, p_to_account, p_amount, 'transfer', p_description);

    SET v_transaction_id = LAST_INSERT_ID();

    INSERT INTO audit_log (transaction_id, action_name, result, details)
    VALUES (v_transaction_id, 'transfer_funds', 'success', p_description);

    COMMIT;
END//

DELIMITER ;