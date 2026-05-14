import {
  pgTable, uuid, text, integer, numeric, timestamp,
  boolean, pgEnum, uniqueIndex, index
} from 'drizzle-orm/pg-core';

// Enums
export const roleEnum = pgEnum('role', ['Owner', 'Staff']);
export const notificationStatusEnum = pgEnum('notification_status', ['unread', 'read', 'dismissed']);
export const notificationTypeEnum = pgEnum('notification_type', ['low_stock', 'dead_stock', 'system']);

// users — mirrors Supabase Auth users, stores role for RBAC
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull().default(''),
  role: roleEnum('role').notNull().default('Staff'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// deliveryProviders — configurable list managed in Settings
export const deliveryProviders = pgTable('delivery_providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// products — core inventory catalog
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  brand: text('brand').notNull(),
  size: text('size').notNull(),
  pattern: text('pattern').notNull(),
  quantity: integer('quantity').notNull().default(0),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull(),
  retailPrice: numeric('retail_price', { precision: 12, scale: 2 }).notNull(),
  deliveryProvider: text('delivery_provider').notNull(),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (t) => ({
  brandSizePatternUnique: uniqueIndex('products_brand_size_pattern_unique')
    .on(t.brand, t.size, t.pattern),
  brandIdx: index('products_brand_idx').on(t.brand),
  sizeIdx: index('products_size_idx').on(t.size)
}));

// stockIn — incoming inventory transactions
export const stockIn = pgTable('stock_in', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  deliveryProvider: text('delivery_provider').notNull(),
  salesInvoiceNumber: text('sales_invoice_number'),
  date: timestamp('date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (t) => ({
  dateIdx: index('stock_in_date_idx').on(t.date),
  productIdx: index('stock_in_product_idx').on(t.productId)
}));

// stockOut — outgoing inventory transactions
export const stockOut = pgTable('stock_out', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  reason: text('reason').notNull(),
  date: timestamp('date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (t) => ({
  dateIdx: index('stock_out_date_idx').on(t.date),
  productIdx: index('stock_out_product_idx').on(t.productId)
}));

// sales — sales transactions with computed financials
export const sales = pgTable('sales', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantitySold: integer('quantity_sold').notNull(),
  revenue: numeric('revenue', { precision: 12, scale: 2 }).notNull(),
  cost: numeric('cost', { precision: 12, scale: 2 }).notNull(),
  grossProfit: numeric('gross_profit', { precision: 12, scale: 2 }).notNull(),
  date: timestamp('date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (t) => ({
  dateIdx: index('sales_date_idx').on(t.date),
  productIdx: index('sales_product_idx').on(t.productId)
}));

// notifications — low-stock, dead-stock, and system alerts
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  type: notificationTypeEnum('type').notNull(),
  message: text('message').notNull(),
  status: notificationStatusEnum('status').notNull().default('unread'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// activityLogs — audit trail for Owner-visible user actions
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// settings — system-wide configuration (single row)
export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  globalLowStockThreshold: integer('global_low_stock_threshold').notNull().default(5),
  deadStockDays: integer('dead_stock_days').notNull().default(90),
  theme: text('theme').notNull().default('dark'),
  dateFormat: text('date_format').notNull().default('MM/DD/YYYY'),
  defaultReportDateRange: text('default_report_date_range').notNull().default('30d'),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Inferred TypeScript types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type DeliveryProvider = typeof deliveryProviders.$inferSelect;
export type NewDeliveryProvider = typeof deliveryProviders.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type StockIn = typeof stockIn.$inferSelect;
export type NewStockIn = typeof stockIn.$inferInsert;
export type StockOut = typeof stockOut.$inferSelect;
export type NewStockOut = typeof stockOut.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type Settings = typeof settings.$inferSelect;
