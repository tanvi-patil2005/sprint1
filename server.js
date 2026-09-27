require("dotenv").config();

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { promisify } = require("node:util");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const mysql = require("mysql2/promise");
const scrypt = promisify(crypto.scrypt);

const app = express();
const port = Number(process.env.PORT || 5000);
const uploadsDirectory = path.join(__dirname, "uploads");
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "kalakriti",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const allowedOrigins = (process.env.CORS_ORIGIN || `http://localhost:${port},http://127.0.0.1:${port}`)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)) }));
app.use(express.json({ limit: "100kb" }));
fs.mkdirSync(path.join(uploadsDirectory, "orders"), { recursive: true });
fs.mkdirSync(path.join(uploadsDirectory, "reviews"), { recursive: true });

const imageStorage = multer.diskStorage({
  destination: (request, file, callback) => {
    const folder = request.path.endsWith("/reviews") ? "reviews" : "orders";
    callback(null, path.join(uploadsDirectory, folder));
  },
  filename: (request, file, callback) => {
    const extensions = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
    callback(null, `${crypto.randomUUID()}${extensions[file.mimetype] || ".img"}`);
  },
});
const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (request, file, callback) => {
    const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!supportedTypes.includes(file.mimetype)) {
      return callback(new Error("Upload a JPG, PNG, WEBP, or GIF image."));
    }
    callback(null, true);
  },
});

app.get("/", (request, response) => response.sendFile(path.join(__dirname, "index.html")));
app.get("/admin", (request, response) => response.sendFile(path.join(__dirname, "admin.html")));
app.get("/admin.html", (request, response) => response.sendFile(path.join(__dirname, "admin.html")));
app.get("/script.js", (request, response) => response.sendFile(path.join(__dirname, "script.js")));
app.get("/admin.js", (request, response) => response.sendFile(path.join(__dirname, "admin.js")));
app.get("/style.css", (request, response) => response.sendFile(path.join(__dirname, "style.css")));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/uploads", express.static(uploadsDirectory));

function requireAdmin(request, response, next) {
  const expectedToken = process.env.ADMIN_TOKEN;
  const providedToken = request.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expectedToken) {
    return response.status(503).json({ error: "Order administration is disabled. Configure ADMIN_TOKEN in .env." });
  }
  if (!providedToken || providedToken.length !== expectedToken.length ||
      !crypto.timingSafeEqual(Buffer.from(providedToken), Buffer.from(expectedToken))) {
    return response.status(401).json({ error: "A valid admin token is required." });
  }
  next();
}

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derivedKey = await scrypt(password, salt, 64);
  const expectedKey = Buffer.from(key, "hex");
  return expectedKey.length === derivedKey.length && crypto.timingSafeEqual(expectedKey, derivedKey);
}

async function createCustomerSession(customerId) {
  const token = crypto.randomBytes(32).toString("hex");
  await pool.execute(
    "INSERT INTO customer_sessions (customer_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))",
    [customerId, hashSessionToken(token)]
  );
  return token;
}

async function getCustomer(request) {
  const token = request.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const [customers] = await pool.execute(
    `SELECT c.id, c.name, c.email
     FROM customer_sessions s JOIN customer_accounts c ON c.id = s.customer_id
     WHERE s.token_hash = ? AND s.expires_at > NOW()`,
    [hashSessionToken(token)]
  );
  return customers[0] || null;
}

async function requireCustomer(request, response, next) {
  try {
    request.customer = await getCustomer(request);
    if (!request.customer) return response.status(401).json({ error: "Sign in to continue." });
    next();
  } catch (error) {
    next(error);
  }
}

function removeUploadedFile(file) {
  if (file) fs.unlink(file.path, () => {});
}

function requiredText(value, label, maximumLength) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return `${label} is required.`;
  if (text.length > maximumLength) return `${label} must be ${maximumLength} characters or fewer.`;
  return null;
}

app.get("/api/health", async (request, response, next) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ok", database: "connected" });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register", async (request, response, next) => {
  try {
    const nameError = requiredText(request.body.name, "Name", 255);
    const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
    const password = typeof request.body.password === "string" ? request.body.password : "";
    if (nameError || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return response.status(400).json({ error: nameError || "Enter a valid email and a password of at least 8 characters." });
    }
    const [existing] = await pool.execute("SELECT id FROM customer_accounts WHERE email = ?", [email]);
    if (existing.length) return response.status(409).json({ error: "An account with this email already exists." });
    const [result] = await pool.execute(
      "INSERT INTO customer_accounts (name, email, password_hash) VALUES (?, ?, ?)",
      [request.body.name.trim(), email, await hashPassword(password)]
    );
    response.status(201).json({ message: "Account created successfully. Please sign in.", customer: { id: result.insertId, name: request.body.name.trim(), email } });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (request, response, next) => {
  try {
    const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
    const password = typeof request.body.password === "string" ? request.body.password : "";
    const [customers] = await pool.execute("SELECT id, name, email, password_hash FROM customer_accounts WHERE email = ?", [email]);
    if (!customers.length || !(await verifyPassword(password, customers[0].password_hash))) {
      return response.status(401).json({ error: "Email or password is incorrect." });
    }
    const customer = customers[0];
    const token = await createCustomerSession(customer.id);
    response.json({ token, customer: { id: customer.id, name: customer.name, email: customer.email } });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", requireCustomer, (request, response) => response.json({ customer: request.customer }));

app.get("/api/my-orders", requireCustomer, async (request, response, next) => {
  try {
    const [orders] = await pool.execute(
      "SELECT id, customer_name, email, mobile, category, artwork_name, size, color, quantity, required_date, budget, customization_details, reference_image, message, status, created_at FROM orders WHERE customer_id = ? ORDER BY created_at DESC",
      [request.customer.id]
    );
    response.json(orders);
  } catch (error) {
    next(error);
  }
});

app.get("/api/artworks", async (request, response, next) => {
  try {
    const [artworks] = await pool.query(
      "SELECT id, name, category, medium, description, price, image FROM artworks ORDER BY id"
    );
    response.json(artworks);
  } catch (error) {
    next(error);
  }
});

app.get("/api/artworks/:id", async (request, response, next) => {
  try {
    const [artworks] = await pool.execute(
      "SELECT id, name, category, medium, description, price, image FROM artworks WHERE id = ?",
      [request.params.id]
    );
    if (!artworks.length) return response.status(404).json({ error: "Artwork not found." });
    response.json(artworks[0]);
  } catch (error) {
    next(error);
  }
});

function validateArtwork(body) {
  for (const [field, label, maximumLength] of [
    ["name", "Artwork name", 255],
    ["category", "Category", 100],
    ["image", "Image path", 500],
  ]) {
    const error = requiredText(body[field], label, maximumLength);
    if (error) return error;
  }
  if (body.medium && body.medium.length > 100) return "Medium must be 100 characters or fewer.";
  if (body.price && body.price.length > 100) return "Price must be 100 characters or fewer.";
  return null;
}

app.post("/api/artworks", requireAdmin, async (request, response, next) => {
  try {
    const validationError = validateArtwork(request.body);
    if (validationError) return response.status(400).json({ error: validationError });
    const artwork = request.body;
    const [result] = await pool.execute(
      "INSERT INTO artworks (name, category, medium, description, price, image) VALUES (?, ?, ?, ?, ?, ?)",
      [artwork.name.trim(), artwork.category.trim(), artwork.medium || null, artwork.description || null,
        artwork.price || null, artwork.image.trim()]
    );
    response.status(201).json({ id: result.insertId, message: "Artwork created." });
  } catch (error) {
    next(error);
  }
});

app.put("/api/artworks/:id", requireAdmin, async (request, response, next) => {
  try {
    const validationError = validateArtwork(request.body);
    if (validationError) return response.status(400).json({ error: validationError });
    const artwork = request.body;
    const [result] = await pool.execute(
      "UPDATE artworks SET name = ?, category = ?, medium = ?, description = ?, price = ?, image = ? WHERE id = ?",
      [artwork.name.trim(), artwork.category.trim(), artwork.medium || null, artwork.description || null,
        artwork.price || null, artwork.image.trim(), request.params.id]
    );
    if (!result.affectedRows) return response.status(404).json({ error: "Artwork not found." });
    response.json({ message: "Artwork updated." });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/artworks/:id", requireAdmin, async (request, response, next) => {
  try {
    const [result] = await pool.execute("DELETE FROM artworks WHERE id = ?", [request.params.id]);
    if (!result.affectedRows) return response.status(404).json({ error: "Artwork not found." });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/reviews", async (request, response, next) => {
  try {
    const [reviews] = await pool.query(
      "SELECT id, customer_name, completed_order_image, message, rating, created_at FROM reviews ORDER BY id DESC LIMIT 50"
    );
    response.json(reviews);
  } catch (error) {
    next(error);
  }
});

app.post("/api/orders", requireCustomer, uploadImage.single("reference-image"), async (request, response, next) => {
  try {
    const form = request.body;
    const validationError = requiredText(form.name, "Customer name", 255) ||
      requiredText(form.email, "Email", 255) || requiredText(form.category, "Artwork category", 100);
    if (validationError) {
      removeUploadedFile(request.file);
      return response.status(400).json({ error: validationError });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      removeUploadedFile(request.file);
      return response.status(400).json({ error: "Enter a valid email address." });
    }
    if (form["artwork-name"]?.length > 255 || form.size?.length > 100 || form.color?.length > 255 ||
        form.budget?.length > 100) {
      removeUploadedFile(request.file);
      return response.status(400).json({ error: "One or more order fields exceed the allowed length." });
    }
    const quantity = form.quantity ? Number(form.quantity) : null;
    if (quantity !== null && (!Number.isInteger(quantity) || quantity < 1)) {
      removeUploadedFile(request.file);
      return response.status(400).json({ error: "Quantity must be a positive whole number." });
    }
    const parsedDate = form.date && new Date(`${form.date}T00:00:00Z`);
    if (form.date && (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) ||
      Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== form.date)) {
      removeUploadedFile(request.file);
      return response.status(400).json({ error: "Enter a valid required date." });
    }

    const [result] = await pool.execute(
      `INSERT INTO orders
        (customer_id, customer_name, email, mobile, category, artwork_name, size, color,
         quantity, required_date, budget, customization_details, reference_image, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        request.customer.id, form.name.trim(), form.email.trim(), form.mobile || null, form.category,
        form["artwork-name"] || null, form.size || null, form.color || null,
        quantity, form.date || null, form.budget || null, form["customization-details"] || null,
        request.file ? `/uploads/orders/${request.file.filename}` : null,
        form.message || null,
      ]
    );
    response.status(201).json({ id: result.insertId, message: "Order request saved." });
  } catch (error) {
    removeUploadedFile(request.file);
    next(error);
  }
});

app.post("/api/reviews", requireCustomer, uploadImage.single("completed-order-image"), async (request, response, next) => {
  try {
    const { name, message, rating } = request.body;
    const numericRating = Number(rating);
    const validationError = requiredText(name, "Customer name", 255) || requiredText(message, "Review", 65535);
    if (validationError || !Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5 || !request.file) {
      removeUploadedFile(request.file);
      return response.status(400).json({ error: validationError || "Provide a rating from 1 to 5 and a completed artwork image." });
    }

    const [result] = await pool.execute(
      "INSERT INTO reviews (customer_name, completed_order_image, message, rating) VALUES (?, ?, ?, ?)",
      [name.trim(), `/uploads/reviews/${request.file.filename}`, message.trim(), numericRating]
    );
    response.status(201).json({
      id: result.insertId,
      customer_name: name.trim(),
      message: message.trim(),
      rating: numericRating,
      completed_order_image: `/uploads/reviews/${request.file.filename}`,
    });
  } catch (error) {
    removeUploadedFile(request.file);
    next(error);
  }
});

app.get("/api/orders", requireAdmin, async (request, response, next) => {
  try {
    const [orders] = await pool.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 500");
    response.json(orders);
  } catch (error) {
    next(error);
  }
});

app.get("/api/orders/:id", requireAdmin, async (request, response, next) => {
  try {
    const [orders] = await pool.execute("SELECT * FROM orders WHERE id = ?", [request.params.id]);
    if (!orders.length) return response.status(404).json({ error: "Order not found." });
    response.json(orders[0]);
  } catch (error) {
    next(error);
  }
});

app.put("/api/orders/:id", requireAdmin, async (request, response, next) => {
  const allowedStatuses = ["Pending", "Confirmed", "In Progress", "Completed", "Cancelled"];
  if (!allowedStatuses.includes(request.body.status)) {
    return response.status(400).json({ error: "Choose a valid order status." });
  }
  try {
    const [orders] = await pool.execute("SELECT id FROM orders WHERE id = ?", [request.params.id]);
    if (!orders.length) return response.status(404).json({ error: "Order not found." });
    await pool.execute("UPDATE orders SET status = ? WHERE id = ?", [request.body.status, request.params.id]);
    response.json({ message: "Order status updated." });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/orders/:id", requireAdmin, async (request, response, next) => {
  try {
    const [result] = await pool.execute("DELETE FROM orders WHERE id = ?", [request.params.id]);
    if (!result.affectedRows) return response.status(404).json({ error: "Order not found." });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error, request, response, next) => {
  if (error instanceof multer.MulterError) {
    return response.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "Images must be 5 MB or smaller." : error.message });
  }
  if (error.message === "Upload a JPG, PNG, WEBP, or GIF image.") {
    return response.status(400).json({ error: error.message });
  }
  if (error.message && error.message.includes("ER_")) {
    console.error("MySQL request failed:", error.message);
  } else {
    console.error(error);
  }
  response.status(500).json({ error: "The request could not be saved. Check the server and MySQL connection." });
});

async function startServer() {
  if (!process.env.DB_USER || process.env.DB_PASSWORD === undefined) {
    throw new Error("Set DB_USER and DB_PASSWORD in .env before starting the server.");
  }
  await pool.query("SELECT 1");
  app.listen(port, () => console.log(`Kalakriti is running at http://localhost:${port}`));
}

startServer().catch((error) => {
  console.error(error.message.includes("Set DB_USER")
    ? error.message
    : "Could not connect to MySQL. Check DB_* values in your .env file.");
  console.error(error.message);
  process.exit(1);
});