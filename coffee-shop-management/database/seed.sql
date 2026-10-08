-- Sample menu and fictional orders for Daily Grind.
-- Safe to run more than once; existing sample rows are left unchanged.

USE daily_grind;

INSERT IGNORE INTO categories (category_name) VALUES
    ('Espresso'),
    ('Cold drinks'),
    ('Tea & more');

INSERT IGNORE INTO products
    (category_id, sku, product_name, description, price, stock_quantity, reorder_level, is_available)
SELECT c.category_id, seed.sku, seed.product_name, seed.description, seed.price,
       seed.stock_quantity, seed.reorder_level, TRUE
FROM (
    SELECT 'ESP-001' AS sku, 'House espresso' AS product_name, 'A rich, balanced double shot.' AS description, 3.25 AS price, 120 AS stock_quantity, 20 AS reorder_level, 'Espresso' AS category_name
    UNION ALL SELECT 'ESP-002', 'Vanilla latte', 'Espresso, steamed milk, vanilla.', 5.25, 80, 15, 'Espresso'
    UNION ALL SELECT 'ESP-003', 'Cappuccino', 'Espresso under soft milk foam.', 4.75, 75, 15, 'Espresso'
    UNION ALL SELECT 'ESP-004', 'Dark mocha', 'Chocolate, espresso, silky milk.', 5.50, 65, 12, 'Espresso'
    UNION ALL SELECT 'CLD-001', 'Slow cold brew', 'Smooth, steeped overnight.', 4.50, 50, 10, 'Cold drinks'
    UNION ALL SELECT 'CLD-002', 'Iced matcha', 'Bright matcha with oat milk.', 5.75, 45, 10, 'Cold drinks'
    UNION ALL SELECT 'TEA-001', 'Spiced chai', 'Black tea with warming spices.', 4.25, 55, 12, 'Tea & more'
    UNION ALL SELECT 'TEA-002', 'House lemonade', 'Fresh lemon, a little sweetness.', 3.75, 40, 10, 'Tea & more'
) AS seed
JOIN categories AS c ON c.category_name = seed.category_name;

INSERT IGNORE INTO orders (order_number, customer_name, order_type, order_status, ordered_at) VALUES
    ('DEMO-1001', 'Jordan Lee', 'Pickup', 'Completed', CURRENT_TIMESTAMP - INTERVAL 2 HOUR),
    ('DEMO-1002', 'Taylor Morgan', 'Dine-in', 'Preparing', CURRENT_TIMESTAMP - INTERVAL 20 MINUTE),
    ('DEMO-1003', 'Casey Nguyen', 'Pickup', 'Pending', CURRENT_TIMESTAMP - INTERVAL 5 MINUTE);

INSERT IGNORE INTO order_items (order_id, product_id, product_name_at_sale, quantity, unit_price)
SELECT o.order_id, p.product_id, p.product_name, 2, p.price
FROM orders AS o
JOIN products AS p ON p.sku = 'ESP-002'
WHERE o.order_number = 'DEMO-1001';

INSERT IGNORE INTO order_items (order_id, product_id, product_name_at_sale, quantity, unit_price)
SELECT o.order_id, p.product_id, p.product_name, 1, p.price
FROM orders AS o
JOIN products AS p ON p.sku = 'CLD-001'
WHERE o.order_number = 'DEMO-1001';

INSERT IGNORE INTO order_items (order_id, product_id, product_name_at_sale, quantity, unit_price)
SELECT o.order_id, p.product_id, p.product_name, 1, p.price
FROM orders AS o
JOIN products AS p ON p.sku = 'ESP-004'
WHERE o.order_number = 'DEMO-1002';

INSERT IGNORE INTO order_items (order_id, product_id, product_name_at_sale, quantity, unit_price)
SELECT o.order_id, p.product_id, p.product_name, 2, p.price
FROM orders AS o
JOIN products AS p ON p.sku = 'TEA-001'
WHERE o.order_number = 'DEMO-1003';
