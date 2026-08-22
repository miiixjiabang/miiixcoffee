import { pgTable, serial, varchar, text, integer, numeric, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// Users table for simple login
export const users = pgTable(
  "users",
  {
    id: serial().primaryKey(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    password_hash: varchar("password_hash", { length: 255 }).notNull(),
    display_name: varchar("display_name", { length: 100 }).notNull(),
    role: varchar("role", { length: 20 }).notNull(), // 'admin' | 'staff'
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_username_idx").on(table.username),
  ]
);

// Stores table (single store for now,预留多店扩展)
export const stores = pgTable(
  "stores",
  {
    id: serial().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

// Materials - all 88 items
export const materials = pgTable(
  "materials",
  {
    id: serial().primaryKey(),
    store_id: integer("store_id").notNull().default(1).references(() => stores.id),
    name: varchar("name", { length: 200 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    unit: varchar("unit", { length: 50 }).notNull(),
    price: numeric("price", { precision: 10, scale: 2 }),
    is_daily: boolean("is_daily").notNull().default(false),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("materials_store_id_idx").on(table.store_id),
    index("materials_category_idx").on(table.category),
    index("materials_is_daily_idx").on(table.is_daily),
  ]
);

// Inventory records (header)
export const inventoryRecords = pgTable(
  "inventory_records",
  {
    id: serial().primaryKey(),
    store_id: integer("store_id").notNull().default(1).references(() => stores.id),
    record_type: varchar("record_type", { length: 20 }).notNull(), // 'daily' | 'weekly' | 'monthly'
    record_date: varchar("record_date", { length: 20 }).notNull(), // 'YYYY-MM-DD' or 'YYYY-Www' or 'YYYY-MM'
    total_amount: numeric("total_amount", { precision: 12, scale: 2 }),
    status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending' | 'approved'
    created_by: integer("created_by").notNull().references(() => users.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    approved_by: integer("approved_by").references(() => users.id),
    approved_at: timestamp("approved_at", { withTimezone: true }),
  },
  (table) => [
    index("inventory_records_store_id_idx").on(table.store_id),
    index("inventory_records_type_idx").on(table.record_type),
    index("inventory_records_date_idx").on(table.record_date),
  ]
);

// Inventory items (line items)
export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: serial().primaryKey(),
    record_id: integer("record_id").notNull().references(() => inventoryRecords.id, { onDelete: "cascade" }),
    material_id: integer("material_id").notNull().references(() => materials.id),
    quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
    unit_price: numeric("unit_price", { precision: 10, scale: 2 }),
    amount: numeric("amount", { precision: 12, scale: 2 }),
    prev_quantity: numeric("prev_quantity", { precision: 12, scale: 2 }),
    consumption: numeric("consumption", { precision: 12, scale: 2 }),
    consumption_amount: numeric("consumption_amount", { precision: 12, scale: 2 }),
  },
  (table) => [
    index("inventory_items_record_id_idx").on(table.record_id),
    index("inventory_items_material_id_idx").on(table.material_id),
  ]
);

// Purchase records
export const purchaseRecords = pgTable(
  "purchase_records",
  {
    id: serial().primaryKey(),
    store_id: integer("store_id").notNull().default(1).references(() => stores.id),
    material_id: integer("material_id").notNull().references(() => materials.id),
    purchase_date: varchar("purchase_date", { length: 10 }).notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
    unit_price: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    total_amount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    created_by: integer("created_by").notNull().references(() => users.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("purchase_records_store_id_idx").on(table.store_id),
    index("purchase_records_material_id_idx").on(table.material_id),
    index("purchase_records_date_idx").on(table.purchase_date),
  ]
);

// Alert thresholds
export const alertThresholds = pgTable(
  "alert_thresholds",
  {
    id: serial().primaryKey(),
    store_id: integer("store_id").notNull().default(1).references(() => stores.id),
    material_id: integer("material_id").notNull().references(() => materials.id),
    threshold: numeric("threshold", { precision: 12, scale: 2 }).notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("alert_thresholds_store_id_idx").on(table.store_id),
    uniqueIndex("alert_thresholds_material_unique_idx").on(table.store_id, table.material_id),
  ]
);
