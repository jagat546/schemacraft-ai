import type { GeneratedSchema } from "@/types/schema"

const LEADING_ARTICLES = new Set(["a", "an", "the"])

export function generateMockSchema(prompt: string): GeneratedSchema {
  const words = prompt.trim().split(/\s+/).map((word) => word.replace(/[^a-zA-Z0-9]/g, ""))
  const entity = words.find((word) => word && !LEADING_ARTICLES.has(word.toLowerCase())) || "item"
  const table = entity.toLowerCase() + "s"
  const model = entity.charAt(0).toUpperCase() + entity.slice(1).toLowerCase()

  const sql = `-- Generated from prompt: "${prompt}"
CREATE TABLE ${table} (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);`

  const drizzle = `import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"

export const ${table} = pgTable("${table}", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})`

  const json = JSON.stringify(
    [
      { id: 1, name: `Sample ${model} A`, createdAt: new Date().toISOString() },
      { id: 2, name: `Sample ${model} B`, createdAt: new Date().toISOString() },
    ],
    null,
    2
  )

  return { sql, drizzle, json }
}
