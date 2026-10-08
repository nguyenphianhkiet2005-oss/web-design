-- Daily Grind reporting and order-management examples.
USE daily_grind;

-- Browse available menu items with their categories and stock levels.
SELECT p.sku, p.product_name, c.category_name, p.price,
       p.stock_quantity, p.reorder_level
FROM products AS p
JOIN categories AS c ON c.category_id = p.category_id
WHERE p.is_available = TRUE
ORDER BY c.category_name, p.product_name;

-- Review open orders and their totals.
SELECT order_number, customer_name, order_type, order_status, ordered_at, order_total
FROM v_order_totals
WHERE order_status IN ('Pending', 'Preparing', 'Ready')
ORDER BY ordered_at;

-- Today's completed sales and number of orders.
SELECT COUNT(*) AS completed_orders,
       COALESCE(SUM(order_total), 0.00) AS sales_total
FROM v_order_totals
WHERE order_status = 'Completed'
  AND ordered_at >= CURRENT_DATE
  AND ordered_at < CURRENT_DATE + INTERVAL 1 DAY;

-- Best-selling drinks by quantity.
SELECT oi.product_name_at_sale AS product,
       SUM(oi.quantity) AS units_sold,
       SUM(oi.line_total) AS sales_total
FROM order_items AS oi
JOIN orders AS o ON o.order_id = oi.order_id
WHERE o.order_status = 'Completed'
GROUP BY oi.product_id, oi.product_name_at_sale
ORDER BY units_sold DESC, sales_total DESC;

-- Products that are at or below their reorder threshold.
SELECT sku, product_name, stock_quantity, reorder_level
FROM products
WHERE is_available = TRUE
  AND stock_quantity <= reorder_level
ORDER BY stock_quantity, product_name;

-- Receipt details for one order; replace DEMO-1001 with an order number.
SELECT o.order_number, o.customer_name, o.order_status, o.ordered_at,
       oi.product_name_at_sale, oi.quantity, oi.unit_price, oi.line_total
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.order_id
WHERE o.order_number = 'DEMO-1001'
ORDER BY oi.order_item_id;
