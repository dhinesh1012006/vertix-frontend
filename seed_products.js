const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'database-1.ctis2sqiuid9.ap-south-1.rds.amazonaws.com',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'MySuperSecretDBPassword123!',
  ssl: { rejectUnauthorized: false }
});

const ALL_PRODUCTS = [
  { id:1,  name:"Nexus Pro Headphones",   cat:"Audio",       price:24900,  orig:33200,  rating:4.2, reviews:1240, emoji:"🎧", badge:"BESTSELLER", desc:"Studio-grade ANC, 40hr battery, Hi-Res Audio certified.", seller:"AudioTech Pro" },
  { id:2,  name:"Quantum V1 Laptop",      cat:"Computers",   price:124900, orig:149900, rating:4.7, reviews:865,  emoji:"💻", badge:"NEW",         desc:"12-core CPU, 32GB RAM, 2TB NVMe, OLED 120Hz, 18hr battery.", seller:"VERTIX Official" },
  { id:3,  name:"Quantum V1 Smartwatch",  cat:"Wearables",   price:37400,  orig:41600,  rating:4.5, reviews:632,  emoji:"⌚", badge:"SALE",        desc:"Always-on AMOLED, ECG + SpO2, GPS, 5ATM water-resistant.", seller:"WearTech" },
  { id:4,  name:"ArcPad Pro Tablet",      cat:"Computers",   price:66600,  orig:83200,  rating:4.4, reviews:418,  emoji:"📱", badge:null,          desc:"12.9\" Liquid Retina, M3 chip, USB-C Thunderbolt 4.", seller:"VERTIX Official" },
  { id:5,  name:"Vortex Gaming Mouse",    cat:"Gaming",      price:7400,   orig:9900,   rating:4.8, reviews:2103, emoji:"🖱️", badge:"TOP PICK",    desc:"26000 DPI, 8 buttons, 95hr battery, ergonomic shell.", seller:"GameGear" },
  { id:6,  name:"NovaBuds X",             cat:"Audio",       price:12400,  orig:16600,  rating:4.3, reviews:987,  emoji:"🎵", badge:"SALE",        desc:"Adaptive ANC, spatial audio, 36hr case battery, IPX4.", seller:"AudioTech Pro" },
  { id:7,  name:"Phantom Keyboard",       cat:"Gaming",      price:14900,  orig:18200,  rating:4.6, reviews:761,  emoji:"⌨️", badge:null,          desc:"Hall-effect switches, 8000Hz polling, per-key RGB.", seller:"GameGear" },
  { id:8,  name:"StreamDeck Elite",       cat:"Gaming",      price:20700,  orig:24900,  rating:4.5, reviews:534,  emoji:"🎮", badge:"NEW",         desc:"32 LCD keys, drag-and-drop actions, USB-C hub.", seller:"GameGear" },
  { id:9,  name:"UltraWide Monitor",      cat:"Computers",   price:54100,  orig:66600,  rating:4.6, reviews:312,  emoji:"🖥️", badge:null,          desc:"34\" IPS, 165Hz, 1ms, HDR600, USB-C 90W, curved.", seller:"DisplayPro" },
  { id:10, name:"Nomad Drone",            cat:"Electronics", price:74900,  orig:91600,  rating:4.3, reviews:187,  emoji:"🚁", badge:"NEW",         desc:"4K/60fps camera, 45min flight, obstacle avoidance.", seller:"SkyTech" },
  { id:11, name:"Carbon Wallet",          cat:"Accessories", price:6600,   orig:8200,   rating:4.9, reviews:2400, emoji:"👛", badge:"TOP PICK",    desc:"RFID blocking carbon fibre, 12 cards, ultra-slim 2mm.", seller:"UrbanCarry" },
  { id:12, name:"Apex Speaker",           cat:"Audio",       price:16600,  orig:20700,  rating:4.5, reviews:678,  emoji:"🔊", badge:"SALE",        desc:"360° sound, IPX7 waterproof, 24hr playtime.", seller:"AudioTech Pro" },
  { id:13, name:"PowerBank 30000",        cat:"Electronics", price:3499,   orig:4999,   rating:4.4, reviews:890,  emoji:"🔋", badge:"SALE",        desc:"30000mAh, 65W fast charge, USB-C + 3 USB-A ports.", seller:"ChargeTech" },
  { id:14, name:"Mechanical Gamepad",     cat:"Gaming",      price:4999,   orig:6499,   rating:4.3, reviews:445,  emoji:"🕹️", badge:null,          desc:"Hall-effect thumbsticks, 12hr battery, cross-platform.", seller:"GameGear" },
  { id:15, name:"Smart LED Desk Lamp",    cat:"Electronics", price:2299,   orig:2999,   rating:4.6, reviews:1120, emoji:"💡", badge:null,          desc:"Touch-dimmer, 5 colour temps, USB-C charging port.", seller:"LightHouse" },
  { id:16, name:"Titanium Laptop Stand",  cat:"Accessories", price:5499,   orig:6999,   rating:4.7, reviews:760,  emoji:"🗂️", badge:"TOP PICK",    desc:"Aerospace titanium, 8-angle adjustable, 12kg load.", seller:"DeskPro" },
];

async function seedDB() {
  await client.connect();
  console.log("Connected to DB, seeding products...");

  try {
    // 1. Ensure a "System Data" dummy user acts as the seller
    let sellerId = 1;
    const { rows: sellers } = await client.query("SELECT id FROM users LIMIT 1");
    if (sellers.length > 0) {
      sellerId = sellers[0].id;
    } else {
      console.log("Creating default seller user...");
      const sysUser = await client.query(
        "INSERT INTO users (name, email, role) VALUES ($1, $2, $3) RETURNING id",
        ["VERTIX Official", "official@vertix.com", "seller"]
      );
      sellerId = sysUser.rows[0].id;
    }

    // 2. Insert all products if they don't exist
    for (const p of ALL_PRODUCTS) {
      // Force ID insertion requires specifying the ID column
      await client.query(
        `INSERT INTO products (id, seller_id, name, description, category, price, orig_price, stock, emoji, badge, rating, review_count) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET 
         name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock`,
        [p.id, sellerId, p.name, p.desc, p.cat, p.price, p.orig, Math.floor(Math.random() * 50) + 10, p.emoji, p.badge, p.rating, p.reviews]
      );
      console.log(`Upserted ${p.id}: ${p.name}`);
    }

    // Reset sequence so auto-increment works for new seller products
    await client.query("SELECT setval(pg_get_serial_sequence('products', 'id'), (SELECT MAX(id) FROM products));");

    console.log("✅ Seed completed successfully.");
  } catch (err) {
    console.error("Error seeding DB:", err);
  } finally {
    await client.end();
  }
}

seedDB();
