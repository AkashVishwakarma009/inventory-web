import { db } from "./db";
import { users, products, stockTransactions, sessions, storageLocations, storageDimensions } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export async function runMigrations() {
  try {
    // Create users table
    await db.execute(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      role VARCHAR(30) NOT NULL DEFAULT 'stock_in_manager',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create products table
    await db.execute(`CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      unit VARCHAR(50) NOT NULL,
      opening_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
      current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create stock_transactions table
    await db.execute(`CREATE TABLE IF NOT EXISTS stock_transactions (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      type VARCHAR(10) NOT NULL,
      quantity DECIMAL(10,2) NOT NULL,
      original_quantity DECIMAL(10,2),
      original_unit VARCHAR(50),
      previous_stock DECIMAL(10,2) NOT NULL,
      new_stock DECIMAL(10,2) NOT NULL,
      remarks TEXT,
      transaction_date TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      so_number VARCHAR(100),
      po_number VARCHAR(100),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Add missing columns if they don't exist (for existing databases)
    try {
      await db.execute(`ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS so_number VARCHAR(100)`);
      await db.execute(`ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS po_number VARCHAR(100)`);
      await db.execute(`ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS original_quantity DECIMAL(10,2)`);
      await db.execute(`ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS original_unit VARCHAR(50)`);
    } catch (error) {
      // Columns may already exist, continue
    }

    // Create sessions table
    await db.execute(`CREATE TABLE IF NOT EXISTS sessions (
      sid VARCHAR(128) PRIMARY KEY,
      sess JSONB NOT NULL,
      expire TIMESTAMP NOT NULL
    )`);

    // Create storage_locations table
    await db.execute(`CREATE TABLE IF NOT EXISTS storage_locations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed default storage locations
    const defaults = [
      'Dry Storage Location',
      'Cold Storage',
      'Freezer Storage',
      'Overflow Storage',
      'Package Storage Room'
    ];
    for (const loc of defaults) {
      await db.execute(`INSERT INTO storage_locations (name) VALUES ('${loc.replace(/'/g, "''")}') ON CONFLICT (name) DO NOTHING`);
    }

    // Create storage_dimensions table
    // Some Postgres versions don't support CREATE TYPE IF NOT EXISTS for enums; use a DO block
    await db.execute(`DO $$ BEGIN
      CREATE TYPE dimension_type AS ENUM ('row','deck','section');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await db.execute(`CREATE TABLE IF NOT EXISTS storage_dimensions (
      id SERIAL PRIMARY KEY,
      location_id INTEGER NOT NULL REFERENCES storage_locations(id) ON DELETE CASCADE,
      type dimension_type NOT NULL,
      name VARCHAR(100) NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Ensure uniqueness to avoid duplicates when seeding
    await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS uniq_storage_dimensions_loc_type_name ON storage_dimensions (location_id, type, name)`);

    // Seed defaults for known locations
    // Package Storage Room sections B1-B4
    const pkgRow = await db
      .select({ id: storageLocations.id })
      .from(storageLocations)
      .where(eq(storageLocations.name, 'Package Storage Room'))
      .limit(1);
    const pkgId = pkgRow[0]?.id as number | undefined;
    if (pkgId) {
      const sections = ['B1','B2','B3','B4'];
      for (let i=0;i<sections.length;i++) {
        const name = sections[i].replace(/'/g, "''");
        await db.execute(`INSERT INTO storage_dimensions (location_id,type,name,"order") VALUES (${pkgId}, 'section', '${name}', ${i}) ON CONFLICT (location_id,type,name) DO NOTHING`);
      }
    }

    // Generic default rows and decks for other locations (Row 1..4, Deck 1..4)
    const allLocs = await db.select({ id: storageLocations.id, name: storageLocations.name }).from(storageLocations);
    const otherRows = allLocs.filter((r: any) => r.name !== 'Package Storage Room');
    for (const r of otherRows as any[]) {
      const id = r.id as number;
      for (let i=1;i<=4;i++) {
        await db.execute(`INSERT INTO storage_dimensions (location_id,type,name,"order") VALUES (${id}, 'row', 'Row ${i}', ${i}) ON CONFLICT (location_id,type,name) DO NOTHING`);
        await db.execute(`INSERT INTO storage_dimensions (location_id,type,name,"order") VALUES (${id}, 'deck', 'Deck ${i}', ${i}) ON CONFLICT (location_id,type,name) DO NOTHING`);
      }
    }

    // Create index for sessions
    await db.execute(`CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire)`);

    // Insert super admin user if doesn't exist
    const existingUser = await db.select().from(users).where(eq(users.username, "Sudhamrit"));
    if (existingUser.length === 0) {
      const hashedPassword = await bcrypt.hash("Sudhamrit@1234", 10);
      
      await db.insert(users).values({
        username: "Sudhamrit",
        password: hashedPassword,
        email: "admin@inventory.com",
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin"
      });
      console.log("Super admin user created: username=Sudhamrit, password=Sudhamrit@1234");
    }

    console.log("Database migrations completed successfully");
  } catch (error) {
    console.error("Error running migrations:", error);
    throw error;
  }
}
