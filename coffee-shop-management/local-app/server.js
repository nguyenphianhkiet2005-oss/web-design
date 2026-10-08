require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const mysql = require('mysql2/promise');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const pool = mysql.createPool({
    host: process.env.MYSQLHOST || '127.0.0.1',
    port: Number(process.env.MYSQLPORT || 3306),
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'daily_grind',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    decimalNumbers: true
});

const statuses = ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
const transitions = {
    Pending: ['Preparing', 'Cancelled'],
    Preparing: ['Ready'],
    Ready: ['Completed'],
    Completed: [],
    Cancelled: []
};

function sendJson(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
    });
    res.end(JSON.stringify(data));
}

function sendError(res, status, message) {
    sendJson(res, status, { error: message });
}

function readJson(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        let tooLarge = false;
        req.setEncoding('utf8');
        req.on('data', chunk => {
            if (tooLarge) return;
            raw += chunk;
            if (Buffer.byteLength(raw, 'utf8') > 16_384) {
                tooLarge = true;
                reject(Object.assign(new Error('Request is too large.'), { status: 413 }));
            }
        });
        req.on('end', () => {
            if (tooLarge) return;
            try {
                resolve(JSON.parse(raw || '{}'));
            } catch {
                reject(Object.assign(new Error('Request must contain valid JSON.'), { status: 400 }));
            }
        });
        req.on('error', reject);
    });
}

function checkOrigin(req, res) {
    const origin = req.headers.origin;
    if (!origin) return true;
    const expected = `http://127.0.0.1:${PORT}`;
    if (origin !== expected && origin !== `http://localhost:${PORT}`) {
        sendError(res, 403, 'Requests must come from the local Daily Grind app.');
        return false;
    }
    return true;
}

async function handleMenu(res) {
    const [rows] = await pool.execute(
        `SELECT p.product_id, p.product_name, p.description, p.price,
                p.stock_quantity, c.category_name
         FROM products AS p
         JOIN categories AS c ON c.category_id = p.category_id
         WHERE p.is_available = TRUE
         ORDER BY c.category_name, p.product_name`
    );
    sendJson(res, 200, rows.map(row => ({
        id: row.product_id,
        name: row.product_name,
        description: row.description,
        category: row.category_name,
        priceCents: Math.round(row.price * 100),
        stock: row.stock_quantity
    })));
}

async function handleOrders(res) {
    const [rows] = await pool.execute(
        `SELECT o.order_id, o.order_number, o.customer_name, o.order_type,
                o.order_status, o.ordered_at, v.order_total,
                oi.product_name_at_sale, oi.quantity, oi.unit_price
         FROM orders AS o
         JOIN v_order_totals AS v ON v.order_id = o.order_id
         LEFT JOIN order_items AS oi ON oi.order_id = o.order_id
         ORDER BY o.ordered_at DESC, oi.order_item_id DESC
         LIMIT 500`
    );
    const orders = new Map();
    for (const row of rows) {
        let order = orders.get(row.order_id);
        if (!order) {
            order = {
                id: row.order_id,
                number: row.order_number,
                customer: row.customer_name,
                type: row.order_type,
                status: row.order_status,
                createdAt: row.ordered_at,
                totalCents: Math.round(row.order_total * 100),
                items: []
            };
            orders.set(row.order_id, order);
        }
        if (row.product_name_at_sale !== null) {
            order.items.push({
                name: row.product_name_at_sale,
                quantity: row.quantity,
                unitPriceCents: Math.round(row.unit_price * 100)
            });
        }
    }
    sendJson(res, 200, [...orders.values()]);
}

async function handleMetrics(res) {
    const [rows] = await pool.execute(
        `SELECT
            COALESCE(SUM(order_status IN ('Pending', 'Preparing', 'Ready')), 0) AS open_orders,
            COALESCE(SUM(
                order_status = 'Completed'
                AND ordered_at >= CURRENT_DATE
                AND ordered_at < CURRENT_DATE + INTERVAL 1 DAY
            ), 0) AS completed_today,
            COALESCE(SUM(
                CASE
                    WHEN order_status = 'Completed'
                     AND ordered_at >= CURRENT_DATE
                     AND ordered_at < CURRENT_DATE + INTERVAL 1 DAY
                    THEN order_total ELSE 0
                END
            ), 0.00) AS sales_today
         FROM v_order_totals`
    );
    const row = rows[0];
    sendJson(res, 200, {
        openOrders: Number(row.open_orders),
        completedToday: Number(row.completed_today),
        salesTodayCents: Math.round(Number(row.sales_today) * 100)
    });
}

async function handleCreateOrder(req, res) {
    if (!checkOrigin(req, res)) return;
    const body = await readJson(req);
    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
    if (!customerName || customerName.length > 100 || !Array.isArray(body.items) ||
        body.items.length < 1 || body.items.length > 20) {
        return sendError(res, 400, 'Enter a pickup name and choose 1 to 20 menu items.');
    }

    const quantities = new Map();
    for (const item of body.items) {
        if (!item || typeof item !== 'object' ||
            !Number.isInteger(item.productId) || item.productId < 1 ||
            !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
            return sendError(res, 400, 'Each menu item must have a valid product and quantity from 1 to 20.');
        }
        quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
    }
    if ([...quantities.values()].some(quantity => quantity > 20)) {
        return sendError(res, 400, 'The maximum quantity for one drink is 20.');
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const products = [];
        for (const [productId, quantity] of quantities) {
            const [rows] = await connection.execute(
                `SELECT product_id, product_name, price, stock_quantity
                 FROM products
                 WHERE product_id = ? AND is_available = TRUE
                 FOR UPDATE`,
                [productId]
            );
            const product = rows[0];
            if (!product) {
                await connection.rollback();
                return sendError(res, 400, 'A selected drink is no longer available. Refresh the menu.');
            }
            if (product.stock_quantity < quantity) {
                await connection.rollback();
                return sendError(res, 409, `${product.product_name} has only ${product.stock_quantity} left.`);
            }
            products.push({ ...product, quantity });
        }

        const orderNumber = `DG-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        const [orderResult] = await connection.execute(
            `INSERT INTO orders (order_number, customer_name, order_type, order_status, notes)
             VALUES (?, ?, 'Pickup', 'Pending', 'Local portfolio order')`,
            [orderNumber, customerName]
        );
        for (const product of products) {
            await connection.execute(
                `INSERT INTO order_items
                 (order_id, product_id, product_name_at_sale, quantity, unit_price)
                 VALUES (?, ?, ?, ?, ?)`,
                [orderResult.insertId, product.product_id, product.product_name,
                    product.quantity, product.price]
            );
            await connection.execute(
                `UPDATE products
                 SET stock_quantity = stock_quantity - ?
                 WHERE product_id = ?`,
                [product.quantity, product.product_id]
            );
        }
        await connection.execute(
            `INSERT INTO order_status_history (order_id, previous_status, new_status)
             VALUES (?, NULL, 'Pending')`,
            [orderResult.insertId]
        );
        await connection.commit();
        sendJson(res, 201, { orderNumber, message: 'Pickup order saved to the local MySQL database.' });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function handleStatusUpdate(req, res, orderId) {
    if (!checkOrigin(req, res)) return;
    const body = await readJson(req);
    const nextStatus = body.status;
    if (!statuses.includes(nextStatus)) {
        return sendError(res, 400, 'Choose a valid order status.');
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.execute(
            `SELECT order_id, order_status
             FROM orders WHERE order_id = ? FOR UPDATE`,
            [orderId]
        );
        const order = rows[0];
        if (!order) {
            await connection.rollback();
            return sendError(res, 404, 'Order not found.');
        }
        if (!transitions[order.order_status].includes(nextStatus)) {
            await connection.rollback();
            return sendError(res, 409, 'That order status change is not allowed.');
        }
        if (nextStatus === 'Cancelled') {
            const [items] = await connection.execute(
                `SELECT product_id, quantity FROM order_items WHERE order_id = ?`,
                [order.order_id]
            );
            for (const item of items) {
                await connection.execute(
                    `UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?`,
                    [item.quantity, item.product_id]
                );
            }
        }
        await connection.execute(
            `UPDATE orders SET order_status = ? WHERE order_id = ?`,
            [nextStatus, order.order_id]
        );
        await connection.execute(
            `INSERT INTO order_status_history (order_id, previous_status, new_status)
             VALUES (?, ?, ?)`,
            [order.order_id, order.order_status, nextStatus]
        );
        await connection.commit();
        sendJson(res, 200, { orderId: order.order_id, status: nextStatus });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function serveStatic(req, res, pathname) {
    const allowedFiles = {
        '/': ['index.html', 'text/html; charset=utf-8'],
        '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
        '/style.css': ['style.css', 'text/css; charset=utf-8'],
        '/local.css': ['local.css', 'text/css; charset=utf-8']
    };
    const entry = allowedFiles[pathname];
    if (!entry || req.method !== 'GET') return false;
    const filePath = pathname === '/style.css'
        ? path.resolve(__dirname, '../app/style.css')
        : pathname === '/local.css'
            ? path.join(PUBLIC_DIR, entry[0])
            : path.join(PUBLIC_DIR, entry[0]);
    try {
        const content = await fs.promises.readFile(filePath);
        res.writeHead(200, {
            'Content-Type': entry[1],
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'no-referrer'
        });
        res.end(content);
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
    return true;
}

async function handle(req, res) {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    if (req.method === 'GET' && url.pathname === '/api/health') {
        await pool.query('SELECT 1');
        return sendJson(res, 200, { status: 'ok', database: 'connected' });
    }
    if (req.method === 'GET' && url.pathname === '/api/menu') return handleMenu(res);
    if (req.method === 'GET' && url.pathname === '/api/orders') return handleOrders(res);
    if (req.method === 'GET' && url.pathname === '/api/metrics') return handleMetrics(res);
    if (req.method === 'POST' && url.pathname === '/api/orders') return handleCreateOrder(req, res);
    const statusMatch = url.pathname.match(/^\/api\/orders\/(\d+)\/status$/);
    if (req.method === 'PATCH' && statusMatch) return handleStatusUpdate(req, res, statusMatch[1]);
    if (await serveStatic(req, res, url.pathname)) return;
    sendError(res, 404, 'Page or API endpoint not found.');
}

const server = http.createServer((req, res) => {
    handle(req, res).catch(error => {
        console.error('Local request failed:', error.message);
        if (!res.headersSent) {
            const status = Number.isInteger(error.status) ? error.status : 500;
            sendError(res, status, status === 500
                ? 'The local app could not complete the request. Check the MySQL connection and server console.'
                : error.message);
        } else {
            res.destroy();
        }
    });
});

async function start() {
    if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) {
        throw new Error('PORT must be a number from 1024 to 65535.');
    }
    if (!process.env.MYSQLPASSWORD) {
        throw new Error('Set MYSQLPASSWORD in local-app/.env before starting.');
    }
    await pool.query('SELECT 1');
    server.listen(PORT, '127.0.0.1', () => {
        console.info(`Daily Grind is running locally at http://127.0.0.1:${PORT}/`);
    });
}

start().catch(async error => {
    console.error(`Daily Grind could not start: ${error.message}`);
    await pool.end();
    process.exitCode = 1;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => server.close(async () => {
        await pool.end();
        process.exit(0);
    }));
}
