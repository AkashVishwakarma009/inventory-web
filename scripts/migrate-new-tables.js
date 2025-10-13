#!/usr/bin/env node

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Auto-migration script for new database modules
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

console.log("🔗 Connecting to database for auto-migration...");

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

async function autoMigrate() {
  try {
    console.log("📝 Running auto-migration for inventory management system...");
    
    // Sessions table for express-session storage
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR(128) PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP NOT NULL
      )
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire)
    `;
    
    // Users table with multi-role support
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(30), -- Legacy single role field - nullable for pending users
        roles JSON NOT NULL DEFAULT '[]', -- New multiple roles field
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Products table
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        unit VARCHAR(50) NOT NULL, -- KG, Litre, Pieces, etc.
        opening_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
        current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Stock transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS stock_transactions (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        type VARCHAR(10) NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        original_quantity DECIMAL(10, 2),
        original_unit VARCHAR(50),
        previous_stock DECIMAL(10, 2) NOT NULL,
        new_stock DECIMAL(10, 2) NOT NULL,
        transaction_date TIMESTAMP NOT NULL,
        so_number VARCHAR(100),
        po_number VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Weekly stock plans table
    await sql`
      CREATE TABLE IF NOT EXISTS weekly_stock_plans (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id),
        name VARCHAR(255), -- Product name for display
        user_id INTEGER NOT NULL REFERENCES users(id),
        present_stock DECIMAL(10, 2) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        previous_week_stock DECIMAL(10, 2) NOT NULL,
        planned_quantity DECIMAL(10, 2) NOT NULL,
        week_start_date DATE NOT NULL,
        week_end_date DATE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Low stock alerts table
    await sql`
      CREATE TABLE IF NOT EXISTS low_stock_alerts (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id),
        weekly_plan_id INTEGER NOT NULL REFERENCES weekly_stock_plans(id),
        current_stock DECIMAL(10, 2) NOT NULL,
        planned_quantity DECIMAL(10, 2) NOT NULL,
        alert_level VARCHAR(20) NOT NULL DEFAULT 'low', -- low, critical
        is_resolved BOOLEAN NOT NULL DEFAULT false,
        alert_date TIMESTAMP NOT NULL,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Orders table
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        employee_name VARCHAR(100),
        customer_name VARCHAR(100),
        customer_number VARCHAR(50),
        order_number VARCHAR(50),
        order_items TEXT,
        delivery_date DATE,
        delivery_time TIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create default super admin user if not exists
    await sql`
      INSERT INTO users (username, password, email, role, roles, first_name, last_name)
      SELECT 'Sudhamrit', '$2b$10$Q3QnBLz1y5LxGYZb1yOm9eX3mPVy6X7c1Z4d1s5qQ1h1d1d1d1d1d1', 'admin@sudhamrit.com', 'super_admin', '["super_admin"]', 'Admin', 'User'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'Sudhamrit')
    `;
    
    console.log("✅ Migration completed successfully!");
    console.log("📋 All tables created:");
    console.log("   - sessions (express session storage)");
    console.log("   - users (user management with multi-role support)");
    console.log("   - products (inventory product catalog)");
    console.log("   - stock_transactions (stock movement tracking)");
    console.log("   - weekly_stock_plans (weekly planning system)");
    console.log("   - low_stock_alerts (automated stock alerts)");
    console.log("   - orders (order management system)");
    console.log("🔑 Default admin account: username=Sudhamrit, password=Sudhamrit@1234");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

autoMigrate();
