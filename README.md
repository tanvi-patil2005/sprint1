# Kalakriti MySQL setup

The existing website is served by Express at `http://localhost:5000`; use that URL rather than opening `index.html` as a local file or using Live Server.

## Configure MySQL

1. Install and start MySQL Server.
2. Copy `.env.example` to `.env` and set `DB_USER`, `DB_PASSWORD`, and a long random `ADMIN_TOKEN`. `.env` is ignored by Git and is never served to the browser.
3. Import `database.sql` using MySQL Workbench, or run `npm run db:init` from PowerShell in this folder. This creates the schema and seeds the existing gallery artwork and six existing reviews; seeding is safe to repeat.

For direct SQL import from PowerShell:

```powershell
cmd /c "mysql -u root -p < database.sql"
```

Use the MySQL account matching `DB_USER` and `DB_PASSWORD`. If MySQL is on a different host or port, update `DB_HOST` and `DB_PORT`.

## Run

```powershell
npm install
npm run db:init
npm start
```

Open `http://localhost:5000`. Check MySQL connectivity at `http://localhost:5000/api/health`.

The gallery and testimonials load from MySQL. Customers create an account in the **My Account** section before placing orders or submitting reviews. Their orders appear in their customer dashboard with the current status. Order requests and reviews are saved to MySQL; uploaded image files are stored in `uploads/orders/` and `uploads/reviews/` (5 MB maximum; JPG, PNG, WEBP, and GIF).

## Admin orders

Open `http://localhost:5000/admin` for the separate admin dashboard and enter the `ADMIN_TOKEN` configured in `.env`. The page displays every customer order and allows its status to be changed. The token is stored in the current browser session only. Keep it private and do not deploy the demo token from `.env.example`.

## API

- `GET /api/artworks` and `GET /api/artworks/:id`
- `POST /api/artworks`, `PUT /api/artworks/:id`, `DELETE /api/artworks/:id` (admin token required)
- `POST /api/orders` (multipart form); `GET /api/orders`, `GET /api/orders/:id`, `PUT /api/orders/:id`, `DELETE /api/orders/:id` (admin token required)
- `POST /api/reviews` (multipart form) and `GET /api/reviews`