#!/usr/bin/env node

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, products, stockTransactions, lowStockAlerts } from "../shared/schema.js";
import bcrypt from "bcrypt";

// Database setup script for production deployment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

console.log("🔗 Connecting to database...");

// Configure SSL for Supabase
const isSupabase = DATABASE_URL.includes('supabase.co');
const sql = postgres(DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: isSupabase ? { 
    rejectUnauthorized: false,
  } : 'require',
  connect_timeout: 30,
  idle_timeout: 30,
});

const db = drizzle(sql, { 
  schema: { users, products, stockTransactions, lowStockAlerts } 
});

async function initializeDatabase() {
  try {
    console.log("📝 Creating database tables...");
    
    // Create tables using CREATE IF NOT EXISTS
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        roles TEXT[] DEFAULT ARRAY[]::TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        base_unit VARCHAR(50) NOT NULL,
        conversion_factor DECIMAL(10, 4) NOT NULL DEFAULT 1,
        current_stock DECIMAL(10, 4) DEFAULT 0,
        planned_stock DECIMAL(10, 4) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS stock_transactions (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        type VARCHAR(50) NOT NULL,
        quantity DECIMAL(10, 4) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS low_stock_alerts (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        threshold_quantity DECIMAL(10, 4) NOT NULL,
        current_quantity DECIMAL(10, 4) NOT NULL,
        is_acknowledged BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP NOT NULL
      )
    `;
    
    console.log("✅ Tables created successfully");
    
    // Check if super admin exists
    const existingAdmin = await sql`
      SELECT id FROM users WHERE username = 'Sudhamrit' LIMIT 1
    `;
    
    if (existingAdmin.length === 0) {
      console.log("👤 Creating default admin user...");
      const hashedPassword = await bcrypt.hash('Sudhamrit@1234', 10);
      
      await sql`
        INSERT INTO users (username, password_hash, roles)
        VALUES ('Sudhamrit', ${hashedPassword}, ARRAY['super_admin'])
      `;
      
      console.log("✅ Default admin user created");
      console.log("📧 Username: Sudhamrit");
      console.log("🔑 Password: Sudhamrit@1234");
      console.log("⚠️  Please change the password after first login");
    } else {
      console.log("👤 Admin user already exists");
    }
    
    console.log("🎉 Database initialization complete!");
    
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

initializeDatabase();