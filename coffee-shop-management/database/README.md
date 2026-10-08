# Daily Grind MySQL database

This is the downloadable local MySQL database for the coffee shop order-management portfolio project.

## Requirements

- MySQL Server 8.0 or newer
- MySQL Workbench (optional, for a graphical import)

## Import using MySQL Workbench

1. Open MySQL Workbench and connect to your local MySQL server.
2. Open `schema.sql` and run it to create the `daily_grind` database and tables.
3. Open and run `seed.sql` to add the sample drink menu. The order dashboard starts empty so you can create your own test orders.
4. Open and run `queries.sql` to try the menu, sales, order, and low-stock reports.
5. For the local web application setup steps, see `local-app/README.md` in the project repository.

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
- `order_status_history`: the status changes made to each order.
- `v_order_totals`: view calculating each order's total.

The seed script adds fictional menu items and can be run repeatedly without duplicating them. It does not create orders or reduce sample inventory; create your own practice orders in the local app.

## Important

The public GitHub Pages preview stores sample orders in the current browser and is **not connected** to this MySQL database. The separate local app uses this database on the same computer. This project does not process payments or collect real online orders.
