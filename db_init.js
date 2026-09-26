const { Client } = require('pg');
const client = new Client({
  host: 'database-1.ctis2sqiuid9.ap-south-1.rds.amazonaws.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'MySuperSecretDBPassword123!',
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  await client.connect();
  console.log("Connected, creating tables...");
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      password VARCHAR(255),
      phone VARCHAR(20),
      role VARCHAR(20),
      photo_url TEXT,
      dob DATE,
      gender VARCHAR(20),
      bio TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER REFERENCES users(id),
      name VARCHAR(255),
      description TEXT,
      category VARCHAR(100),
      price DECIMAL(10,2),
      orig_price DECIMAL(10,2),
      stock INTEGER,
      emoji VARCHAR(10),
      badge VARCHAR(50),
      is_active BOOLEAN DEFAULT true,
      image_url TEXT,
      rating DECIMAL(3,1) DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES products(id),
      user_id INTEGER REFERENCES users(id),
      rating INTEGER,
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cart (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      product_id INTEGER REFERENCES products(id),
      qty INTEGER,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      label VARCHAR(50),
      name VARCHAR(100),
      phone VARCHAR(20),
      street TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      zip VARCHAR(20),
      country VARCHAR(100),
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      address_id INTEGER REFERENCES addresses(id),
      status VARCHAR(50) DEFAULT 'processing',
      payment_mode VARCHAR(50),
      subtotal DECIMAL(10,2),
      gst DECIMAL(10,2),
      total DECIMAL(10,2),
      placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id),
      product_id INTEGER REFERENCES products(id),
      name VARCHAR(255),
      emoji VARCHAR(10),
      image_url TEXT,
      qty INTEGER,
      price DECIMAL(10,2)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      type VARCHAR(50),
      title VARCHAR(255),
      message TEXT,
      icon VARCHAR(10),
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS seller_stats (
      seller_id INTEGER PRIMARY KEY REFERENCES users(id),
      revenue DECIMAL(10,2) DEFAULT 0,
      products_sold INTEGER DEFAULT 0,
      active_listings INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS wishlist (
      user_id INTEGER REFERENCES users(id),
      product_id INTEGER REFERENCES products(id),
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, product_id)
    );
  `);
  
  console.log("Schema created successfully!");
  await client.end();
}

initDB().catch(console.error);
