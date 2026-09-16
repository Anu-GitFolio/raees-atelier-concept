import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    cart: text("cart").notNull().default("[]"),
    wishlist: text("wishlist").notNull().default("[]"),
    profile: text("profile").notNull().default("{}"),
    revision: integer("revision").notNull().default(0),
    expires: integer("expires").notNull(),
    window: integer("window").notNull().default(0),
    requests: integer("requests").notNull().default(0),
  },
  (t) => [index("idx_sessions_expires").on(t.expires)],
);
export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    key: text("idempotency_key").notNull(),
    items: text("items").notNull(),
    subtotal: integer("subtotal").notNull(),
    shipping: integer("shipping").notNull(),
    total: integer("total").notNull(),
    created: integer("created").notNull(),
  },
  (t) => [
    uniqueIndex("idx_orders_session_key").on(t.sessionId, t.key),
    index("idx_orders_session_created").on(t.sessionId, t.created),
  ],
);
