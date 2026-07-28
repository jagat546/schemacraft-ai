import type { GeneratedSchema } from "@/types/schema"

// Static, hand-authored example for the landing page's Interactive Demo
// (Landing-Experience-Specification.md §Interactive Demo) -- a curated,
// non-trivial e-commerce schema (9 tables) shown without ever running a
// real generation. Every artifact below describes the same schema and
// follows this product's own real conventions (uuid PKs, FK-column
// indexes per TD-003, a composite-uniqueness constraint on the
// join-table-shaped cart_items per TD-004) so the demo reads as
// authentic, not a mismatched mockup.
export const INTERACTIVE_DEMO_SCHEMA: GeneratedSchema = {
  sql: `CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL UNIQUE,
  full_name varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id),
  name varchar(255) NOT NULL,
  description text,
  price_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_id_idx ON products(category_id);

CREATE TABLE addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  line1 varchar(255) NOT NULL,
  city varchar(255) NOT NULL,
  postal_code varchar(20) NOT NULL,
  country varchar(2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX addresses_user_id_idx ON addresses(user_id);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  address_id uuid NOT NULL REFERENCES addresses(id),
  status varchar(20) NOT NULL DEFAULT 'pending',
  total_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_id_idx ON orders(user_id);
CREATE INDEX orders_address_id_idx ON orders(address_id);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL,
  unit_price_cents integer NOT NULL
);
CREATE INDEX order_items_order_id_idx ON order_items(order_id);
CREATE INDEX order_items_product_id_idx ON order_items(product_id);

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  user_id uuid NOT NULL REFERENCES users(id),
  rating integer NOT NULL,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_product_id_idx ON reviews(product_id);
CREATE INDEX reviews_user_id_idx ON reviews(user_id);

CREATE TABLE carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES carts(id),
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL,
  UNIQUE (cart_id, product_id)
);
CREATE INDEX cart_items_cart_id_idx ON cart_items(cart_id);
CREATE INDEX cart_items_product_id_idx ON cart_items(product_id);
`,
  drizzle: `import { integer, pgTable, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").notNull().references(() => categories.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  line1: varchar("line1", { length: 255 }).notNull(),
  city: varchar("city", { length: 255 }).notNull(),
  postalCode: varchar("postal_code", { length: 20 }).notNull(),
  country: varchar("country", { length: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  addressId: uuid("address_id").notNull().references(() => addresses.id),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  totalCents: integer("total_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
})

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  body: text("body"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id").notNull().references(() => carts.id),
    productId: uuid("product_id").notNull().references(() => products.id),
    quantity: integer("quantity").notNull(),
  },
  (table) => [unique().on(table.cartId, table.productId)]
)
`,
  json: `{
  "users": [
    { "id": "3f8a1e2c-1111-4a11-8a11-000000000001", "email": "amina@example.com", "full_name": "Amina Yusuf", "created_at": "2026-01-04T09:12:00Z" },
    { "id": "3f8a1e2c-1111-4a11-8a11-000000000002", "email": "leo@example.com", "full_name": "Leo Martins", "created_at": "2026-01-05T14:03:00Z" }
  ],
  "categories": [
    { "id": "6b2c1d3e-2222-4b22-8b22-000000000001", "name": "Keyboards", "created_at": "2026-01-01T00:00:00Z" },
    { "id": "6b2c1d3e-2222-4b22-8b22-000000000002", "name": "Monitors", "created_at": "2026-01-01T00:00:00Z" }
  ],
  "products": [
    { "id": "9c3d2e4f-3333-4c33-8c33-000000000001", "category_id": "6b2c1d3e-2222-4b22-8b22-000000000001", "name": "Mechanical Keyboard 75%", "description": "Hot-swappable, tactile switches.", "price_cents": 9900, "created_at": "2026-01-02T00:00:00Z" },
    { "id": "9c3d2e4f-3333-4c33-8c33-000000000002", "category_id": "6b2c1d3e-2222-4b22-8b22-000000000002", "name": "27in 4K Monitor", "description": "IPS panel, 60Hz.", "price_cents": 32900, "created_at": "2026-01-02T00:00:00Z" }
  ],
  "addresses": [
    { "id": "1a2b3c4d-4444-4d44-8d44-000000000001", "user_id": "3f8a1e2c-1111-4a11-8a11-000000000001", "line1": "12 River Road", "city": "Lagos", "postal_code": "100001", "country": "NG", "created_at": "2026-01-04T09:15:00Z" }
  ],
  "orders": [
    { "id": "5e6f7a8b-5555-4e55-8e55-000000000001", "user_id": "3f8a1e2c-1111-4a11-8a11-000000000001", "address_id": "1a2b3c4d-4444-4d44-8d44-000000000001", "status": "paid", "total_cents": 9900, "created_at": "2026-01-06T10:00:00Z" }
  ],
  "order_items": [
    { "id": "7c8d9e0f-6666-4f66-8f66-000000000001", "order_id": "5e6f7a8b-5555-4e55-8e55-000000000001", "product_id": "9c3d2e4f-3333-4c33-8c33-000000000001", "quantity": 1, "unit_price_cents": 9900 }
  ],
  "reviews": [
    { "id": "2b3c4d5e-7777-4a77-8a77-000000000001", "product_id": "9c3d2e4f-3333-4c33-8c33-000000000001", "user_id": "3f8a1e2c-1111-4a11-8a11-000000000002", "rating": 5, "body": "Best keyboard I've owned.", "created_at": "2026-01-10T08:00:00Z" }
  ],
  "carts": [
    { "id": "4d5e6f7a-8888-4b88-8b88-000000000001", "user_id": "3f8a1e2c-1111-4a11-8a11-000000000002", "created_at": "2026-01-11T12:00:00Z" }
  ],
  "cart_items": [
    { "id": "8e9f0a1b-9999-4c99-8c99-000000000001", "cart_id": "4d5e6f7a-8888-4b88-8b88-000000000001", "product_id": "9c3d2e4f-3333-4c33-8c33-000000000002", "quantity": 1 }
  ]
}
`,
  documentation: `# E-Commerce Schema

## Tables

- [users](#users)
- [categories](#categories)
- [products](#products)
- [addresses](#addresses)
- [orders](#orders)
- [order_items](#order_items)
- [reviews](#reviews)
- [carts](#carts)
- [cart_items](#cart_items)

## users

Registered customers.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| email | varchar(255) | Unique |
| full_name | varchar(255) | |
| created_at | timestamptz | |

## categories

Product categories.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | varchar(255) | Unique |
| created_at | timestamptz | |

## products

Items for sale, each in one category.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| category_id | uuid | References categories.id |
| name | varchar(255) | |
| description | text | Nullable |
| price_cents | integer | |
| created_at | timestamptz | |

## addresses

Shipping addresses belonging to a user.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | References users.id |
| line1 | varchar(255) | |
| city | varchar(255) | |
| postal_code | varchar(20) | |
| country | varchar(2) | ISO 3166-1 alpha-2 |
| created_at | timestamptz | |

## orders

A user's placed order, shipped to one address.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | References users.id |
| address_id | uuid | References addresses.id |
| status | varchar(20) | Default 'pending' |
| total_cents | integer | |
| created_at | timestamptz | |

## order_items

Line items belonging to an order.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| order_id | uuid | References orders.id |
| product_id | uuid | References products.id |
| quantity | integer | |
| unit_price_cents | integer | Price at time of purchase |

## reviews

A user's review of a product.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| product_id | uuid | References products.id |
| user_id | uuid | References users.id |
| rating | integer | 1-5 |
| body | text | Nullable |
| created_at | timestamptz | |

## carts

A user's single active cart (one-to-one).

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | References users.id, unique |
| created_at | timestamptz | |

## cart_items

Items currently in a cart. \`(cart_id, product_id)\` is unique — adding the
same product twice increments quantity rather than creating a duplicate row.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| cart_id | uuid | References carts.id |
| product_id | uuid | References products.id |
| quantity | integer | |

## Relationships

- categories 1—* products
- users 1—* addresses
- users 1—* orders
- addresses 1—* orders
- orders 1—* order_items
- products 1—* order_items
- products 1—* reviews
- users 1—* reviews
- users 1—1 carts
- carts 1—* cart_items
- products 1—* cart_items
`,
  mermaidDiagram: `erDiagram
  users ||--o{ addresses : "has"
  users ||--o{ orders : "places"
  users ||--o{ reviews : "writes"
  users ||--|| carts : "has"
  categories ||--o{ products : "contains"
  products ||--o{ order_items : "ordered as"
  products ||--o{ reviews : "reviewed in"
  products ||--o{ cart_items : "added as"
  addresses ||--o{ orders : "ships"
  orders ||--o{ order_items : "contains"
  carts ||--o{ cart_items : "contains"
`,
}
