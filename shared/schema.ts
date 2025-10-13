import {
  pgTable,
  text,
  varchar,
  timestamp,
  json,
  index,
  serial,
  integer,
  decimal,
  pgEnum,
  date,
  boolean,
  time, // <-- Add this
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enum and table for location-specific dimensions (rows, decks, sections)
export const dimensionType = pgEnum("dimension_type", ["row", "deck", "section"]);

// New table to manage storage locations dynamically
export const storageLocations = pgTable("storage_locations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const storageDimensions = pgTable(
  "storage_dimensions",
  {
    id: serial("id").primaryKey(),
    locationId: integer("location_id").notNull().references(() => storageLocations.id, { onDelete: "cascade" }),
    type: dimensionType("type").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_storage_dimensions_location").on(table.locationId),
    index("idx_storage_dimensions_location_type").on(table.locationId, table.type),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid", { length: 128 }).primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  countryCode: varchar("country_code", { length: 10 }), // e.g., +91, +1, etc.
  mobileNumber: varchar("mobile_number", { length: 20 }), // Mobile number without country code
  role: varchar("role", { length: 30 }), // Legacy single role field - nullable for pending users
  roles: json("roles").$type<UserRole[]>().notNull().default([]), // New multiple roles field
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(), // KG, Litre, Pieces, etc.
  openingStock: decimal("opening_stock", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  currentStock: decimal("current_stock", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),

  // Optional expiry date for perishable products
  expiryDate: date("expiry_date"),

  // Storage/location fields to match Inventory.tsx form
  storageLocation: varchar("storage_location", { length: 100 }).notNull().default("Dry Storage Location"),
  storageRow:     varchar("storage_row",     { length: 50  }).notNull().default("Row 1"),
  storageDeck:    varchar("storage_deck",    { length: 50  }).notNull().default("Deck 1"),

  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_products_name").on(table.name),
  index("idx_products_active").on(table.isActive),
  index("idx_products_storage_location").on(table.storageLocation),
]);

// Stock transactions table
export const stockTransactions = pgTable("stock_transactions", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  userId: integer("user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 10 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  originalQuantity: decimal("original_quantity", { precision: 10, scale: 2 }),
  originalUnit: varchar("original_unit", { length: 50 }),
  previousStock: decimal("previous_stock", { precision: 10, scale: 2 }).notNull(),
  newStock: decimal("new_stock", { precision: 10, scale: 2 }).notNull(),

  transactionDate: timestamp("transaction_date").notNull(),
  soNumber: varchar("so_number", { length: 100 }),
  poNumber: varchar("po_number", { length: 100 }),

  // snapshot storage fields (nullable)
  storageLocation: varchar("storage_location", { length: 100 }),
  storageRow:      varchar("storage_row",     { length: 50  }),
  storageDeck:     varchar("storage_deck",    { length: 50  }),

  // snapshot of product expiry at time of transaction (nullable)
  productExpiry: date("product_expiry"),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_stock_transactions_product_id").on(table.productId),
  index("idx_stock_transactions_user_id").on(table.userId),
  index("idx_stock_transactions_type").on(table.type),
  index("idx_stock_transactions_date").on(table.transactionDate),
  index("idx_stock_transactions_created_at").on(table.createdAt),
  index("idx_stock_transactions_product_type").on(table.productId, table.type),
  index("idx_stock_transactions_date_type").on(table.transactionDate, table.type)
]);

// Weekly stock plans table
export const weeklyStockPlans = pgTable("weekly_stock_plans", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  name: varchar("name", { length: 255 }), // <-- Add this line
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  presentStock: decimal("present_stock", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  previousWeekStock: decimal("previous_week_stock", { precision: 10, scale: 2 }).notNull(),
  plannedQuantity: decimal("planned_quantity", { precision: 10, scale: 2 }).notNull(),
  weekStartDate: date("week_start_date").notNull(),
  weekEndDate: date("week_end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Low stock alerts table
export const lowStockAlerts = pgTable("low_stock_alerts", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  weeklyPlanId: integer("weekly_plan_id")
    .notNull()
    .references(() => weeklyStockPlans.id),
  currentStock: decimal("current_stock", { precision: 10, scale: 2 }).notNull(),
  plannedQuantity: decimal("planned_quantity", { precision: 10, scale: 2 }).notNull(),
  alertLevel: varchar("alert_level", { length: 20 }).notNull().default("low"), // low, critical
  isResolved: boolean("is_resolved").notNull().default(false),
  alertDate: timestamp("alert_date").notNull(),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  employeeName: varchar("employee_name", { length: 100 }),
  customerName: varchar("customer_name", { length: 100 }),
  customerNumber: varchar("customer_number", { length: 50 }),
  orderNumber: varchar("order_number", { length: 50 }),
  orderItems: text("order_items"),
  deliveryDate: date("delivery_date"),
  deliveryTime: time("delivery_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(stockTransactions),
  weeklyStockPlans: many(weeklyStockPlans),
}));

export const productsRelations = relations(products, ({ many }) => ({
  transactions: many(stockTransactions),
  weeklyStockPlans: many(weeklyStockPlans),
  lowStockAlerts: many(lowStockAlerts),
}));

export const stockTransactionsRelations = relations(
  stockTransactions,
  ({ one }) => ({
    product: one(products, {
      fields: [stockTransactions.productId],
      references: [products.id],
    }),
    user: one(users, {
      fields: [stockTransactions.userId],
      references: [users.id],
    }),
  }),
);

export const weeklyStockPlansRelations = relations(
  weeklyStockPlans,
  ({ one, many }) => ({
    product: one(products, {
      fields: [weeklyStockPlans.productId],
      references: [products.id],
    }),
    user: one(users, {
      fields: [weeklyStockPlans.userId],
      references: [users.id],
    }),
    lowStockAlerts: many(lowStockAlerts),
  }),
);

export const lowStockAlertsRelations = relations(
  lowStockAlerts,
  ({ one }) => ({
    product: one(products, {
      fields: [lowStockAlerts.productId],
      references: [products.id],
    }),
    weeklyPlan: one(weeklyStockPlans, {
      fields: [lowStockAlerts.weeklyPlanId],
      references: [weeklyStockPlans.id],
    }),
  }),
);

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  role: z.enum([
    "super_admin",
    "master_inventory_handler",
    "stock_in_manager",
    "stock_out_manager",
    "attendance_checker",
    "weekly_stock_planner",
    "orders",
    "send_message",
    "all_reports",
    "label_printing",
    "storage_management",
  ]).default('stock_in_manager'),
  roles: z.array(z.enum([
    "super_admin",
    "master_inventory_handler",
    "stock_in_manager",
    "stock_out_manager",
    "attendance_checker",
    "weekly_stock_planner",
    "orders",
    "send_message",
    "all_reports",
    "label_printing",
    "storage_management",
  ])).default([]),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  currentStock: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

// Storage location schemas
export const insertStorageLocationSchema = createInsertSchema(storageLocations).omit({
  id: true,
  createdAt: true,
});

export const insertStorageDimensionSchema = createInsertSchema(storageDimensions).omit({
  id: true,
  createdAt: true,
});

export const insertStockTransactionSchema = createInsertSchema(
  stockTransactions,
).omit({
  id: true,
  previousStock: true,
  newStock: true,
  createdAt: true,
  transactionDate: true,
  productExpiry: true,
});

export const stockInSchema = insertStockTransactionSchema.extend({
  poNumber: z.string().optional(),
});

export const stockOutSchema = insertStockTransactionSchema
  .extend({
    soNumber: z.string().optional(),
  })
  .omit({
    quantity: true,
  })
  .extend({
    quantityOut: z.string().min(1, "Quantity out is required"),
  });

export const updateProductSchema = createInsertSchema(products)
  .omit({
    currentStock: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

export const insertWeeklyStockPlanSchema = createInsertSchema(weeklyStockPlans).omit({
  id: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLowStockAlertSchema = createInsertSchema(lowStockAlerts).omit({
  id: true,
  isResolved: true,
  resolvedAt: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
} as any);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
export type StockTransaction = typeof stockTransactions.$inferSelect;
export type InsertStockTransaction = z.infer<
  typeof insertStockTransactionSchema
>;
export type WeeklyStockPlan = typeof weeklyStockPlans.$inferSelect;
export type InsertWeeklyStockPlan = z.infer<typeof insertWeeklyStockPlanSchema>;
export type LowStockAlert = typeof lowStockAlerts.$inferSelect;
export type InsertLowStockAlert = z.infer<typeof insertLowStockAlertSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type StorageLocation = typeof storageLocations.$inferSelect;
export type InsertStorageLocation = z.infer<typeof insertStorageLocationSchema>;
export type StorageDimension = typeof storageDimensions.$inferSelect;
export type InsertStorageDimension = z.infer<typeof insertStorageDimensionSchema>;

// Extended types with relations
export type ProductWithTransactions = Product & {
  transactions: StockTransaction[];
};

export type StockTransactionWithDetails = StockTransaction & {
  product: Product;
  user: User;
};

export type WeeklyStockPlanWithDetails = WeeklyStockPlan & {
  product: Product;
  user: User;
};

export type LowStockAlertWithDetails = LowStockAlert & {
  product: Product;
  weeklyPlan: WeeklyStockPlan;
};

export type UserRole =
  | "super_admin"
  | "master_inventory_handler"
  | "stock_in_manager"
  | "stock_out_manager"
  | "attendance_checker"
  | "weekly_stock_planner"
  | "orders"
  | "send_message"
  | "all_reports"
  | "label_printing"
  | "storage_management";


// Helper type for multiple roles support
export type UserWithRoles = User & {
  activeRoles: UserRole[];
};

// Helper functions for role management
export function getUserActiveRoles(user: User): UserRole[] {
  // If the user has roles array and it's not empty, use it
  if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles;
  }
  // Fallback to legacy single role field, but only if it exists
  if (user.role) {
    return [user.role as UserRole];
  }
  // Return empty array for users awaiting role assignment
  return [];
}

export function hasUserRole(user: User, targetRole: UserRole): boolean {
  const activeRoles = getUserActiveRoles(user);
  return activeRoles.includes(targetRole);
}

export function hasUserAnyRole(user: User, targetRoles: UserRole[]): boolean {
  const activeRoles = getUserActiveRoles(user);
  return targetRoles.some(role => activeRoles.includes(role));
}
