# Daily Grind: Coffee Shop Order Manager

An English-language portfolio project with two ways to explore it:

1. **Hosted portfolio preview:** The interactive browser demo at `app/index.html` runs on GitHub Pages and saves sample orders in that browser only.
2. **Local MySQL application:** `local-app/` runs on one computer, reads the menu and stores orders in a MySQL database on that computer.

Both versions are for demonstration and practice. They do not process payments or send real customer orders to a cafe. The hosted preview cannot connect to a database installed on your personal computer.

## Run the local MySQL application

See [`local-app/README.md`](local-app/README.md) for the Windows setup steps. You will need Node.js 20 or newer and MySQL Server 8.0 or newer. MySQL Workbench can import the provided schema and sample data.

## Download the database

The [`downloads/daily-grind-mysql.zip`](downloads/daily-grind-mysql.zip) archive contains the database schema, sample menu and orders, reporting queries, and MySQL import guide.

## Important scope

The local app binds only to `127.0.0.1`, so only the same computer can open it. This keeps the initial portfolio project simple and avoids publishing a database or collecting online orders. No Square account, payment credentials, or cloud database is needed.
