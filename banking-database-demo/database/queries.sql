USE banking_demo;

-- Customer balances
SELECT * FROM account_summary ORDER BY customer_name, account_type;

-- Monthly transaction volume
SELECT
    DATE_FORMAT(created_at, '%Y-%m') AS month,
    transaction_type,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_amount
FROM transactions
GROUP BY month, transaction_type
ORDER BY month DESC, transaction_type;

-- Atomic transfer example. Test with fictional seed data only.
CALL transfer_funds(1, 3, 125.50, 'Demo transfer for database testing');

-- Verify the audit trail
SELECT t.transaction_id, t.amount, t.description, a.result, a.created_at
FROM transactions t
JOIN audit_log a ON a.transaction_id = t.transaction_id
ORDER BY a.created_at DESC;