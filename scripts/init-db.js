require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

async function initializeDatabase() {
  if (!process.env.DB_USER || process.env.DB_PASSWORD === undefined) {
    throw new Error("Set DB_USER and DB_PASSWORD in .env before initializing the database.");
  }
  const schemaPath = path.join(__dirname, "..", "database.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });

  try {
    await connection.query("CREATE DATABASE IF NOT EXISTS kalakriti CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    await connection.query("USE kalakriti");
    await migratePreviousSchema(connection);
    await connection.query(schema);
    const orderColumns = await getColumns(connection, "orders");
    if (!orderColumns.has("customer_id")) {
      await connection.query("ALTER TABLE orders ADD customer_id INT NULL");
    }
    console.log("Database 'kalakriti' and schema initialized; catalog and sample reviews seeded.");
  } finally {
    await connection.end();
  }
}

async function getColumns(connection, tableName) {
  const [rows] = await connection.execute(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [tableName]
  );
  return new Set(rows.map((row) => row.COLUMN_NAME));
}

async function migratePreviousSchema(connection) {
  const artworkColumns = await getColumns(connection, "artworks");
  if (artworkColumns.has("title") && !artworkColumns.has("name")) {
    await connection.query(
      "ALTER TABLE artworks ADD name VARCHAR(255) NULL, ADD medium VARCHAR(100) NULL, ADD price VARCHAR(100) NULL, ADD image VARCHAR(500) NULL"
    );
    await connection.query(
      "UPDATE artworks SET name = title, image = image_path, price = 'Price on Request' WHERE name IS NULL"
    );
    await connection.query(
      "ALTER TABLE artworks MODIFY slug VARCHAR(120) NULL, MODIFY title VARCHAR(180) NULL, MODIFY category_filters VARCHAR(120) NULL, MODIFY image_path VARCHAR(255) NULL"
    );
  }

  const orderColumns = await getColumns(connection, "orders");
  if (orderColumns.has("preferred_size") && !orderColumns.has("size")) {
    await connection.query("ALTER TABLE orders ADD size VARCHAR(100) NULL, ADD color VARCHAR(255) NULL, ADD message TEXT NULL");
    await connection.query(
      "UPDATE orders SET size = preferred_size, color = preferred_color, message = additional_message"
    );
  }
  if (orderColumns.has("status")) {
    await connection.query(
      "ALTER TABLE orders MODIFY status VARCHAR(50) NOT NULL DEFAULT 'Pending'"
    );
    await connection.query(
      "UPDATE orders SET status = CASE status WHEN 'new' THEN 'Pending' WHEN 'in_progress' THEN 'In Progress' WHEN 'completed' THEN 'Completed' WHEN 'cancelled' THEN 'Cancelled' ELSE status END"
    );
  }

  const reviewColumns = await getColumns(connection, "reviews");
  if (reviewColumns.has("image_path") && !reviewColumns.has("completed_order_image")) {
    await connection.query("ALTER TABLE reviews ADD completed_order_image VARCHAR(500) NULL");
    await connection.query("UPDATE reviews SET completed_order_image = image_path");
  }
}

initializeDatabase().catch((error) => {
  console.error("Database initialization failed. Check MySQL is running and DB_* values in .env are correct.");
  console.error(error.message);
  process.exitCode = 1;
});