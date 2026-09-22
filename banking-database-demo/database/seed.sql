USE banking_demo;

INSERT INTO customers (full_name, email) VALUES
    ('Jordan Lee', 'jordan.lee@example.test'),
    ('Taylor Morgan', 'taylor.morgan@example.test'),
    ('Casey Nguyen', 'casey.nguyen@example.test');

INSERT INTO accounts (customer_id, account_number, account_type, balance) VALUES
    (1, '1000000001', 'checking', 2450.00),
    (1, '1000000002', 'savings', 8200.00),
    (2, '1000000003', 'checking', 5120.75),
    (3, '1000000004', 'checking', 1875.40);

INSERT INTO transactions (from_account_id, to_account_id, amount, transaction_type, description) VALUES
    (NULL, 1, 2500.00, 'deposit', 'Opening deposit'),
    (NULL, 2, 8200.00, 'deposit', 'Opening savings deposit'),
    (NULL, 3, 5120.75, 'deposit', 'Payroll deposit'),
    (NULL, 4, 1875.40, 'deposit', 'Opening deposit');