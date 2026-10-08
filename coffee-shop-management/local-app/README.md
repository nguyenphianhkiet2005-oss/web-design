# Daily Grind Local MySQL App

This is the local, database-backed version of the coffee shop ordering project. It runs on one computer and stores menu, order, inventory, and order-status data in that computer's MySQL database.

## Requirements

- Windows 10 or newer
- Node.js 20 or newer
- MySQL Server 8.0 or newer
- MySQL Workbench (recommended for importing the database)

The hosted GitHub Pages preview is a separate browser-only sample. This local app does not process payments, accept orders from the Internet, or synchronize across devices.

## Set up MySQL

1. Start the MySQL Server service and open MySQL Workbench.
2. Connect to your local MySQL server.
3. Open and run `../database/schema.sql`.
4. Open and run `../database/seed.sql` to add the sample drinks and fictional sample orders.

You can optionally run `../database/queries.sql` to explore the reports.

## Configure and start the app

Open PowerShell in this `local-app` folder:

```powershell
Copy-Item .env.example .env
notepad .env
```

Set `MYSQLPASSWORD` in `.env` to your **local MySQL** password, then save the file. Keep `.env` private; it is excluded from Git.

Install the app dependency and start the local server:

```powershell
npm install
npm start
```

Open <http://127.0.0.1:3000/> in your browser. Keep the PowerShell window open while using the application. Press `Ctrl+C` there to stop the server.

## Try the workflow

1. Search the menu and add drinks to your cart.
2. Enter a pickup name and place the order.
3. Open **Manage orders** to see the order loaded from MySQL.
4. Move it through **Preparing**, **Ready**, and **Completed**; cancel a pending order to return its items to stock.
5. Refresh the page or restart the server. Orders remain in MySQL.

## Local-only safety boundary

The server listens only on `127.0.0.1`, not your Wi-Fi network or a public Internet address. There is no staff login because this starter is intended for one local computer. Use fictional customer names while practicing. Do not use it for real customer records, real sales, or production operations.

For a recruiter, share the public portfolio preview. To demonstrate MySQL persistence, start this local version and show orders remaining after a page refresh.

## Troubleshooting

- **Cannot connect to MySQL:** confirm the MySQL service is running, then check the host, port, username, password, and database in `.env`.
- **Unknown database:** run `../database/schema.sql` in Workbench.
- **Empty menu:** run `../database/seed.sql` in Workbench.
- **Port 3000 is already in use:** stop the other local app or change `PORT` in `.env`, then open the matching `127.0.0.1` port.
