# Daily Grind MySQL database

This is the downloadable MySQL database for the coffee shop order-management project.

## Requirements

- MySQL Server 8.0 or newer
- MySQL Workbench (optional, for a graphical import)

## Import using MySQL Workbench

1. Open MySQL Workbench and connect to your local MySQL server.
2. Open `schema.sql` and run it to create the `daily_grind` database and tables.
3. Open and run `seed.sql` to add the sample menu and fictional orders.
4. Open and run `queries.sql` to try the menu, sales, order, and low-stock reports.

## Import using the MySQL command line

From this `database` folder, run:

```sh
mysql -u root -p < schema.sql
mysql -u root -p < seed.sql
mysql -u root -p < queries.sql
```

Enter your local MySQL password when prompted. Do not put your password in these files.

## Tables

- `categories`: drink-menu categories.
- `products`: menu, prices, availability, and sample stock levels.
- `customers`: optional customer contact records.
- `orders`: pickup/dine-in orders and their statuses.
- `order_items`: item quantities and sale-time price snapshots.
- `v_order_totals`: view calculating each order's total.

The seed script uses fictional examples and can be run repeatedly without duplicating its sample rows.

## Important

The public website is a front-end portfolio demo. It stores its interactive sample orders in the current browser and is **not connected** to this MySQL database. The SQL files are provided for local MySQL practice; this site does not collect real customer data or process payments.
