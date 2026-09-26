// ═══════════════════════════════════════════════════════════════════════════════
//  VERTIX — Complete Backend  (single file: server.js)
//  Stack: Express · PostgreSQL (AWS RDS) · S3 · SNS · JWT · bcrypt
//
//  Install:  npm install express pg bcryptjs jsonwebtoken cors helmet morgan
//            multer multer-s3 @aws-sdk/client-s3 @aws-sdk/client-sns
//            @aws-sdk/s3-request-presigner dotenv express-rate-limit
//            express-validator compression
//
//  Run:      node server.js
//  PM2:      pm2 start server.js --name vertix-api -i max
// ═══════════════════════════════════════════════════════════════════════════════
require("dotenv").config();

const express     = require("express");
const cors        = require("cors");
const helmet      = require("helmet");
const morgan      = require("morgan");
const compression = require("compression");
const rateLimit   = require("express-rate-limit");
const { Pool }    = require("pg");
const bcrypt      = require("bcryptjs");
const jwt         = require("jsonwebtoken");
const multer      = require("multer");
const multerS3    = require("multer-s3");
const path        = require("path");
const { body, validationResult } = require("express-validator");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { SNSClient, PublishCommand }     = require("@aws-sdk/client-sns");

// ─── Config ───────────────────────────────────────────
const PORT      = process.env.PORT      || 5000;
const ENV       = process.env.NODE_ENV  || "development";
const REGION    = process.env.AWS_REGION || "ap-south-1";
const BUCKET    = process.env.S3_BUCKET_NAME;
const CDN       = process.env.CLOUDFRONT_DOMAIN || `https://${BUCKET}.s3.amazonaws.com`;
const JWT_SEC   = process.env.JWT_SECRET || "change_me_to_32_chars_min";
const JWT_EXP   = process.env.JWT_EXPIRES_IN || "7d";
const ORDERS_ARN= process.env.SNS_TOPIC_ARN_ORDERS;
const ALERTS_ARN= process.env.SNS_TOPIC_ARN_ALERTS;

// ═══════════════════════════════════════════════════════════════════════════════
//  DATABASE — AWS RDS PostgreSQL
// ═══════════════════════════════════════════════════════════════════════════════
const db = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME     || "vertix_db",
  user:     process.env.DB_USER     || "vertix_user",
  password: process.env.DB_PASSWORD || "",
  ssl:      process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 10000,
});
db.on("error", err => console.error("[DB]", err.message));

// Shorthand query helper
const q = (sql, params) => db.query(sql, params);

// ═══════════════════════════════════════════════════════════════════════════════
//  AWS — S3 + SNS
// ═══════════════════════════════════════════════════════════════════════════════
const s3Client  = new S3Client({ region: REGION });
const snsClient = new SNSClient({ region: REGION });

// ─── S3 helpers ───────────────────────────────────────
const cdnUrl = key => (key ? `${CDN}/${key}` : null);

const deleteFromS3 = async key => {
  if (!key || !BUCKET) return;
  try { await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })); }
  catch (e) { console.warn("[S3] delete:", e.message); }
};

const makeUploader = (folder, maxMB = 5) =>
  multer({
    storage: multerS3({
      s3: s3Client,
      bucket: BUCKET || "vertix-dev-bucket",
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
      },
    }),
    limits: { fileSize: maxMB * 1024 * 1024 },
    fileFilter: (_, file, cb) =>
      cb(null, [".jpg",".jpeg",".png",".webp",".gif"].includes(
        path.extname(file.originalname).toLowerCase()
      )),
  });

const uploadPhoto   = makeUploader("profiles", 5);
const uploadProduct = makeUploader("products",  10);

// ─── SNS helpers ──────────────────────────────────────
const snsPublish = async (arn, subject, payload) => {
  if (!arn) return;
  try {
    await snsClient.send(new PublishCommand({
      TopicArn: arn,
      Subject:  subject,
      Message:  typeof payload === "object" ? JSON.stringify(payload, null, 2) : payload,
    }));
  } catch (e) { console.warn("[SNS]", e.message); }
};

// Pre-built event publishers
const ev = {
  orderPlaced:  (o, u) => snsPublish(ORDERS_ARN, `New Order ${o.id}`,    { event:"ORDER_PLACED",  orderId:o.id, user:u.email, total:o.total }),
  orderShipped: (o, u) => snsPublish(ORDERS_ARN, `Order ${o.id} Shipped`,{ event:"ORDER_SHIPPED", orderId:o.id, user:u.email }),
  lowStock:     p      => snsPublish(ALERTS_ARN,  `Low Stock: ${p.name}`,{ event:"LOW_STOCK",     product:p.id, stock:p.stock }),
  newSeller:    u      => snsPublish(ALERTS_ARN,  "New Seller Joined",   { event:"SELLER_JOINED", email:u.email }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  JWT MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════
const signToken = (id, role) => jwt.sign({ id, role }, JWT_SEC, { expiresIn: JWT_EXP });

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "No token" });
    const decoded = jwt.verify(header.split(" ")[1], JWT_SEC);
    const { rows } = await q("SELECT id,name,email,role FROM users WHERE id=$1", [decoded.id]);
    if (!rows.length) return res.status(401).json({ error: "User not found" });
    req.user = rows[0];
    next();
  } catch { res.status(401).json({ error: "Invalid or expired token" }); }
};

const seller = (req, res, next) =>
  ["seller","admin"].includes(req.user?.role)
    ? next()
    : res.status(403).json({ error: "Seller account required" });

// ═══════════════════════════════════════════════════════════════════════════════
//  APP SETUP
// ═══════════════════════════════════════════════════════════════════════════════
const app = express();
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy:{ policy:"cross-origin" }, contentSecurityPolicy:false }));
app.use(cors({
  origin: [process.env.FRONTEND_URL,"http://localhost:3000","http://localhost:5173"].filter(Boolean),
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));
app.use(compression());
app.use(morgan(ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit:"10mb" }));
app.use(express.urlencoded({ extended:true, limit:"10mb" }));

// Rate limits
const authLimiter = rateLimit({ windowMs:15*60*1000, max:200, message:{ error:"Too many attempts" } });
const apiLimiter  = rateLimit({ windowMs:60*1000, max:300 });
app.use("/api/auth", authLimiter);
app.use("/api",      apiLimiter);

// ═══════════════════════════════════════════════════════════════════════════════
//  HEALTH CHECK  (ALB probe — /health)
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status:"healthy", service:"vertix-api", uptime:process.uptime(), ts:new Date().toISOString() });
  } catch {
    res.status(503).json({ status:"unhealthy", error:"DB unreachable" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH  /api/auth
// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/register
app.post("/api/auth/register", [
  body("name").trim().notEmpty().withMessage("Name required"),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min:6 }).withMessage("Min 6 chars"),
], async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ errors:errs.array() });

  const { name, email, password, phone, role="buyer" } = req.body;
  try {
    if ((await q("SELECT id FROM users WHERE email=$1",[email])).rows.length)
      return res.status(409).json({ error:"Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await q(
      `INSERT INTO users (name,email,password,phone,role)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id,name,email,phone,role,photo_url,dob,gender,bio`,
      [name, email, hash, phone||null, role]
    );
    const user = rows[0];
    if (role === "seller") ev.newSeller(user);
    await q(
      `INSERT INTO notifications (user_id,type,title,message,icon)
       VALUES ($1,'system','Welcome to VERTIX! 🎉','Your account is ready.','🎉')`,
      [user.id]
    );
    res.status(201).json({ token:signToken(user.id, user.role), user });
  } catch (e) { console.error(e); res.status(500).json({ error:"Server error" }); }
});

// POST /api/auth/login
app.post("/api/auth/login", [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
], async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ errors:errs.array() });

  const { email, password } = req.body;
  try {
    const { rows } = await q("SELECT * FROM users WHERE email=$1",[email]);
    if (!rows.length || !await bcrypt.compare(password, rows[0].password))
      return res.status(401).json({ error:"Invalid credentials" });
    const user = rows[0];
    delete user.password;
    res.json({ token:signToken(user.id, user.role), user });
  } catch (e) { console.error('Login error:', e); res.status(500).json({ error:"Server error", details: e.message }); }
});

// GET /api/auth/me
app.get("/api/auth/me", auth, async (req, res) => {
  const { rows } = await q(
    "SELECT id,name,email,phone,photo_url,dob,gender,bio,role FROM users WHERE id=$1",
    [req.user.id]
  );
  res.json(rows[0]);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PRODUCTS  /api/products
// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/products  — search, filter, sort
app.get("/api/products", async (req, res) => {
  try {
    const { category, search, sort, limit=50, offset=0 } = req.query;
    const where = ["p.is_active=true"], params = [];

    if (category && category !== "All") {
      params.push(category);
      where.push(`p.category=$${params.length}`);
    }
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      where.push(`(LOWER(p.name) LIKE $${params.length} OR LOWER(p.category) LIKE $${params.length} OR LOWER(p.description) LIKE $${params.length})`);
    }

    const orderMap = { price_asc:"p.price ASC", price_desc:"p.price DESC", rating:"p.rating DESC" };
    const orderBy  = orderMap[sort] || "p.created_at DESC";

    params.push(limit, offset);
    const { rows } = await q(
      `SELECT p.*, u.name AS seller_name
       FROM products p JOIN users u ON u.id=p.seller_id
       WHERE ${where.join(" AND ")}
       ORDER BY ${orderBy}
       LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error:"Server error" }); }
});

// GET /api/products/:id
app.get("/api/products/:id", async (req, res) => {
  try {
    const { rows } = await q(
      `SELECT p.*, u.name AS seller_name,
         COALESCE(json_agg(r ORDER BY r.created_at DESC) FILTER (WHERE r.id IS NOT NULL),'[]') AS reviews
       FROM products p JOIN users u ON u.id=p.seller_id
       LEFT JOIN reviews r ON r.product_id=p.id
       WHERE p.id=$1 GROUP BY p.id, u.name`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error:"Not found" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error:"Server error" }); }
});

// POST /api/products  (seller — with S3 image upload)
app.post("/api/products", auth, seller, uploadProduct.single("image"), async (req, res) => {
  try {
    const { name, description, category, price, orig_price, stock, emoji, badge } = req.body;
    const image_url = req.file ? cdnUrl(req.file.key) : null;
    const { rows } = await q(
      `INSERT INTO products (seller_id,name,description,category,price,orig_price,stock,emoji,badge,image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.user.id, name, description, category, price, orig_price||price, stock||0, emoji||"📦", badge||null, image_url]
    );
    res.status(201).json(rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error:"Server error" }); }
});

// PUT /api/products/:id  (seller)
app.put("/api/products/:id", auth, seller, uploadProduct.single("image"), async (req, res) => {
  try {
    const { rows:ex } = await q("SELECT * FROM products WHERE id=$1 AND seller_id=$2",[req.params.id, req.user.id]);
    if (!ex.length) return res.status(404).json({ error:"Not found or not yours" });

    const { name, description, category, price, orig_price, stock, emoji, badge, is_active } = req.body;
    let image_url = ex[0].image_url;
    if (req.file) { if (image_url) deleteFromS3(image_url.replace(`${CDN}/`,"")); image_url = cdnUrl(req.file.key); }

    const { rows } = await q(
      `UPDATE products SET name=$1,description=$2,category=$3,price=$4,orig_price=$5,
       stock=$6,emoji=$7,badge=$8,is_active=$9,image_url=$10,updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [name,description,category,price,orig_price,stock,emoji,badge,is_active!==false,image_url,req.params.id]
    );
    if (rows[0].stock <= 5) ev.lowStock(rows[0]);
    res.json(rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error:"Server error" }); }
});

// DELETE /api/products/:id  (soft delete)
app.delete("/api/products/:id", auth, seller, async (req, res) => {
  await q("UPDATE products SET is_active=false WHERE id=$1 AND seller_id=$2",[req.params.id, req.user.id]);
  res.json({ success:true });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CART  /api/cart
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/api/cart", auth, async (req, res) => {
  const { rows } = await q(
    `SELECT c.id, c.qty, p.id AS product_id, p.name, p.price, p.emoji, p.image_url, p.category, p.stock
     FROM cart c JOIN products p ON p.id=c.product_id
     WHERE c.user_id=$1 ORDER BY c.added_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

app.post("/api/cart", auth, async (req, res) => {
  const { product_id, qty=1 } = req.body;
  const { rows } = await q(
    `INSERT INTO cart (user_id,product_id,qty) VALUES ($1,$2,$3)
     ON CONFLICT (user_id,product_id) DO UPDATE SET qty=cart.qty+EXCLUDED.qty RETURNING *`,
    [req.user.id, product_id, qty]
  );
  res.json(rows[0]);
});

app.put("/api/cart/:productId", auth, async (req, res) => {
  const { qty } = req.body;
  if (qty < 1) {
    await q("DELETE FROM cart WHERE user_id=$1 AND product_id=$2",[req.user.id, req.params.productId]);
    return res.json({ removed:true });
  }
  const { rows } = await q(
    "UPDATE cart SET qty=$1 WHERE user_id=$2 AND product_id=$3 RETURNING *",
    [qty, req.user.id, req.params.productId]
  );
  res.json(rows[0]);
});

app.delete("/api/cart/:productId", auth, async (req, res) => {
  await q("DELETE FROM cart WHERE user_id=$1 AND product_id=$2",[req.user.id, req.params.productId]);
  res.json({ success:true });
});

app.delete("/api/cart", auth, async (req, res) => {
  await q("DELETE FROM cart WHERE user_id=$1",[req.user.id]);
  res.json({ success:true });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  WISHLIST  /api/wishlist
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/api/wishlist", auth, async (req, res) => {
  const { rows } = await q(
    `SELECT p.id,p.name,p.price,p.orig_price,p.emoji,p.image_url,p.category,p.rating,p.review_count,p.badge
     FROM wishlist w JOIN products p ON p.id=w.product_id
     WHERE w.user_id=$1 ORDER BY w.added_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

app.post("/api/wishlist/:productId", auth, async (req, res) => {
  await q("INSERT INTO wishlist (user_id,product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",[req.user.id, req.params.productId]);
  res.json({ added:true });
});

app.delete("/api/wishlist/:productId", auth, async (req, res) => {
  await q("DELETE FROM wishlist WHERE user_id=$1 AND product_id=$2",[req.user.id, req.params.productId]);
  res.json({ removed:true });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ORDERS  /api/orders
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/api/orders", auth, async (req, res) => {
  try {
    const { rows:orders } = await q(
      `SELECT o.*, a.street,a.city,a.state,a.zip,a.country,a.name AS addr_name
       FROM orders o LEFT JOIN addresses a ON a.id=o.address_id
       WHERE o.user_id=$1 ORDER BY o.placed_at DESC`,
      [req.user.id]
    );
    for (const o of orders) {
      const { rows } = await q("SELECT * FROM order_items WHERE order_id=$1",[o.id]);
      o.items   = rows;
      
      // Map to frontend expected format
      const d = new Date(o.placed_at);
      o.date = d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });
      
      const addrParts = [];
      if (o.addr_name) addrParts.push(o.addr_name);
      if (o.street) addrParts.push(o.street);
      if (o.city) addrParts.push(o.city);
      if (o.state) addrParts.push(o.state);
      if (o.zip) addrParts.push(o.zip);
      o.address = addrParts.join(", ");
    }
    res.json(orders);
  } catch (e) { console.error(e); res.status(500).json({ error:"Server error" }); }
});

// POST /api/orders — transactional order placement
app.post("/api/orders", auth, async (req, res) => {
  const { address_id, payment_mode="upi" } = req.body;
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { rows:items } = await client.query(
      `SELECT c.qty,p.id,p.name,p.emoji,p.image_url,p.price,p.stock
       FROM cart c JOIN products p ON p.id=c.product_id WHERE c.user_id=$1`,
      [req.user.id]
    );
    if (!items.length) { await client.query("ROLLBACK"); return res.status(400).json({ error:"Cart is empty" }); }

    for (const item of items) {
      if (item.stock < item.qty) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error:`"${item.name}" only ${item.stock} left in stock` });
      }
    }

    const subtotal = items.reduce((s,i) => s + i.price*i.qty, 0);
    const gst      = Math.round(subtotal * 0.18);
    const total    = subtotal + gst;

    const { rows:[order] } = await client.query(
      `INSERT INTO orders (user_id,address_id,payment_mode,subtotal,gst,total)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, address_id||null, payment_mode, subtotal, gst, total]
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id,product_id,name,emoji,image_url,qty,price)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [order.id, item.id, item.name, item.emoji, item.image_url, item.qty, item.price]
      );
      await client.query("UPDATE products SET stock=stock-$1 WHERE id=$2",[item.qty, item.id]);
    }

    await client.query("DELETE FROM cart WHERE user_id=$1",[req.user.id]);
    await client.query(
      `INSERT INTO notifications (user_id,type,title,message,icon)
       VALUES ($1,'order','Order Confirmed! 🎉',$2,'📦')`,
      [req.user.id, `Order #${String(order.id).slice(0,8).toUpperCase()} · ₹${total.toLocaleString("en-IN")}`]
    );

    await client.query("COMMIT");
    order.items = items;
    ev.orderPlaced(order, req.user);
    res.status(201).json(order);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ error:"Failed to place order" });
  } finally { client.release(); }
});

app.put("/api/orders/:id/status", auth, async (req, res) => {
  const { status } = req.body;
  if (!["processing","shipped","delivered","cancelled"].includes(status))
    return res.status(400).json({ error:"Invalid status" });
  const { rows } = await q("UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *",[status, req.params.id]);
  if (status === "shipped") ev.orderShipped(rows[0], req.user);
  res.json(rows[0]);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ADDRESSES  /api/addresses
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/api/addresses", auth, async (req, res) => {
  const { rows } = await q(
    "SELECT * FROM addresses WHERE user_id=$1 ORDER BY is_default DESC, created_at ASC",
    [req.user.id]
  );
  res.json(rows);
});

app.post("/api/addresses", auth, async (req, res) => {
  const { label, name, phone, street, city, state, zip, country, is_default } = req.body;
  if (!name||!street||!city) return res.status(400).json({ error:"Name, street and city required" });
  if (is_default) await q("UPDATE addresses SET is_default=false WHERE user_id=$1",[req.user.id]);
  const first = (await q("SELECT COUNT(*) FROM addresses WHERE user_id=$1",[req.user.id])).rows[0].count === "0";
  const { rows } = await q(
    `INSERT INTO addresses (user_id,label,name,phone,street,city,state,zip,country,is_default)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.user.id, label||"Home", name, phone||null, street, city, state||null, zip||null, country||"India", is_default||first]
  );
  res.status(201).json(rows[0]);
});

app.put("/api/addresses/:id", auth, async (req, res) => {
  const { label, name, phone, street, city, state, zip, country, is_default } = req.body;
  if (is_default) await q("UPDATE addresses SET is_default=false WHERE user_id=$1",[req.user.id]);
  const { rows } = await q(
    `UPDATE addresses SET label=$1,name=$2,phone=$3,street=$4,city=$5,state=$6,zip=$7,
     country=$8,is_default=COALESCE($9,is_default) WHERE id=$10 AND user_id=$11 RETURNING *`,
    [label, name, phone, street, city, state, zip, country, is_default??null, req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error:"Not found" });
  res.json(rows[0]);
});

app.delete("/api/addresses/:id", auth, async (req, res) => {
  await q("DELETE FROM addresses WHERE id=$1 AND user_id=$2",[req.params.id, req.user.id]);
  res.json({ success:true });
});

app.patch("/api/addresses/:id/default", auth, async (req, res) => {
  await q("UPDATE addresses SET is_default=false WHERE user_id=$1",[req.user.id]);
  const { rows } = await q(
    "UPDATE addresses SET is_default=true WHERE id=$1 AND user_id=$2 RETURNING *",
    [req.params.id, req.user.id]
  );
  res.json(rows[0]);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  NOTIFICATIONS  /api/notifications
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/api/notifications", auth, async (req, res) => {
  const { rows } = await q(
    "SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",
    [req.user.id]
  );
  res.json(rows);
});

app.patch("/api/notifications/read-all", auth, async (req, res) => {
  await q("UPDATE notifications SET is_read=true WHERE user_id=$1",[req.user.id]);
  res.json({ success:true });
});

app.patch("/api/notifications/:id/read", auth, async (req, res) => {
  await q("UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2",[req.params.id, req.user.id]);
  res.json({ success:true });
});

app.delete("/api/notifications/:id", auth, async (req, res) => {
  await q("DELETE FROM notifications WHERE id=$1 AND user_id=$2",[req.params.id, req.user.id]);
  res.json({ success:true });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PROFILE  /api/profile
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/api/profile", auth, async (req, res) => {
  const { rows } = await q(
    "SELECT id,name,email,phone,photo_url,dob,gender,bio,role,created_at FROM users WHERE id=$1",
    [req.user.id]
  );
  res.json(rows[0]);
});

app.put("/api/profile", auth, async (req, res) => {
  const { name, phone, dob, gender, bio } = req.body;
  if (!name?.trim()) return res.status(400).json({ error:"Name is required" });
  const { rows } = await q(
    `UPDATE users SET name=$1,phone=$2,dob=$3,gender=$4,bio=$5,updated_at=NOW()
     WHERE id=$6 RETURNING id,name,email,phone,photo_url,dob,gender,bio,role`,
    [name, phone||null, dob||null, gender||null, bio||null, req.user.id]
  );
  res.json(rows[0]);
});

// POST /api/profile/photo  (S3 upload)
app.post("/api/profile/photo", auth, uploadPhoto.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error:"No file uploaded" });
  const { rows:[user] } = await q("SELECT photo_url FROM users WHERE id=$1",[req.user.id]);
  if (user.photo_url) deleteFromS3(user.photo_url.replace(`${CDN}/`,""));
  const photo_url = cdnUrl(req.file.key);
  const { rows } = await q("UPDATE users SET photo_url=$1,updated_at=NOW() WHERE id=$2 RETURNING photo_url",[photo_url, req.user.id]);
  res.json({ photo_url:rows[0].photo_url });
});

app.delete("/api/profile/photo", auth, async (req, res) => {
  const { rows:[user] } = await q("SELECT photo_url FROM users WHERE id=$1",[req.user.id]);
  if (user.photo_url) deleteFromS3(user.photo_url.replace(`${CDN}/`,""));
  await q("UPDATE users SET photo_url=NULL WHERE id=$1",[req.user.id]);
  res.json({ success:true });
});

app.put("/api/profile/password", auth, async (req, res) => {
  const { current, newPassword } = req.body;
  if (!current||!newPassword||newPassword.length<6)
    return res.status(400).json({ error:"Both fields required, min 6 chars" });
  const { rows:[user] } = await q("SELECT password FROM users WHERE id=$1",[req.user.id]);
  if (!await bcrypt.compare(current, user.password)) return res.status(401).json({ error:"Wrong current password" });
  const hash = await bcrypt.hash(newPassword, 10);
  await q("UPDATE users SET password=$1,updated_at=NOW() WHERE id=$2",[hash, req.user.id]);
  res.json({ success:true });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SELLER DASHBOARD  /api/seller
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/api/seller/stats", auth, seller, async (req, res) => {
  const { rows:[stats] }   = await q("SELECT * FROM seller_stats WHERE seller_id=$1",[req.user.id]);
  const { rows:[pending] } = await q(
    `SELECT COUNT(DISTINCT o.id) AS pending_orders
     FROM orders o JOIN order_items oi ON oi.order_id=o.id
     JOIN products p ON p.id=oi.product_id
     WHERE p.seller_id=$1 AND o.status='processing'`,
    [req.user.id]
  );
  res.json({ ...stats, pending_orders:pending?.pending_orders||0 });
});

app.get("/api/seller/listings", auth, seller, async (req, res) => {
  const { rows } = await q(
    `SELECT p.*, COALESCE(SUM(oi.qty),0) AS sold, COALESCE(SUM(oi.qty*oi.price),0) AS revenue
     FROM products p LEFT JOIN order_items oi ON oi.product_id=p.id
     WHERE p.seller_id=$1 GROUP BY p.id ORDER BY p.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

app.get("/api/seller/orders", auth, seller, async (req, res) => {
  const { rows } = await q(
    `SELECT o.id,o.status,o.total,o.placed_at,
            u.name AS buyer_name, u.email AS buyer_email,
            oi.name AS product_name, oi.qty, oi.price
     FROM orders o
     JOIN order_items oi ON oi.order_id=o.id
     JOIN products p ON p.id=oi.product_id AND p.seller_id=$1
     JOIN users u ON u.id=o.user_id
     ORDER BY o.placed_at DESC LIMIT 100`,
    [req.user.id]
  );
  res.json(rows);
});

app.put("/api/seller/become", auth, async (req, res) => {
  const { rows } = await q("UPDATE users SET role='seller' WHERE id=$1 RETURNING id,name,role",[req.user.id]);
  res.json(rows[0]);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  REVIEWS  /api/reviews
// ═══════════════════════════════════════════════════════════════════════════════
app.post("/api/reviews/:productId", auth, async (req, res) => {
  const { rating, comment } = req.body;
  if (!rating||rating<1||rating>5) return res.status(400).json({ error:"Rating 1–5 required" });
  const { rows } = await q(
    "INSERT INTO reviews (product_id,user_id,rating,comment) VALUES ($1,$2,$3,$4) RETURNING *",
    [req.params.productId, req.user.id, rating, comment||null]
  );
  await q(
    `UPDATE products SET
       rating=(SELECT ROUND(AVG(rating),1) FROM reviews WHERE product_id=$1),
       review_count=(SELECT COUNT(*) FROM reviews WHERE product_id=$1)
     WHERE id=$1`,
    [req.params.productId]
  );
  res.status(201).json(rows[0]);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  404 + GLOBAL ERROR HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
app.use((req, res) => res.status(404).json({ error:`${req.method} ${req.path} not found` }));

app.use((err, req, res, _next) => {
  console.error("[ERROR]", err.stack||err.message);
  res.status(err.status||500).json({
    error: ENV==="production" ? "Internal Server Error" : err.message,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════════════════════════════════════════
app.listen(PORT, "0.0.0.0", () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║  VERTIX API → http://0.0.0.0:${PORT}           ║
  ║  ENV: ${ENV.padEnd(38)}║
  ║  DB:  ${(process.env.DB_HOST||"localhost").slice(0,38).padEnd(38)}║
  ╚══════════════════════════════════════════════╝
  `);
});

module.exports = app;
