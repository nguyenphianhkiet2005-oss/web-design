# Banking Database Demo

A portfolio project that demonstrates relational database design for a simulated banking application. This project does not process real money or store real financial information.

## What it demonstrates

- MySQL schema design with primary keys, foreign keys, constraints, and indexes
- Customer, account, transaction, and audit-log relationships
- Atomic transfers with `START TRANSACTION`, validation, `COMMIT`, and `ROLLBACK`
- Reporting views for account balances and monthly transaction activity
- Seed data and example queries for local development
- A static dashboard demo that can be opened without a backend

## Structure

- `database/schema.sql` - tables, indexes, views, and transfer procedure
- `database/seed.sql` - fictional sample records
- `database/queries.sql` - reporting and verification queries
- `app/index.html` - browser dashboard demo
- `app/style.css` - dashboard styling
- `app/app.js` - fictional dashboard data and table rendering

Open `app/index.html` in a browser to view the dashboard. The dashboard is intentionally static and uses fictional data.

## Run the MySQL demo

1. Create a local MySQL database.
2. Run `database/schema.sql`.
3. Run `database/seed.sql`.
4. Use the examples in `database/queries.sql`.

The dashboard is a front-end presentation only. It intentionally does not connect to a live database or accept real credentials.