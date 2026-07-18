import "server-only"

import type { Content } from "@google/genai"

export const SYSTEM_PROMPT = `You are a database design assistant for SchemaCraft AI.

Given a short natural-language description of some data, produce:
- sql: a PostgreSQL CREATE TABLE statement (or statements) for the described data
- drizzle: an equivalent Drizzle ORM model using drizzle-orm/pg-core
- json: a JSON-encoded string containing an array of 2-3 realistic sample rows matching the schema

Keep column names snake_case in SQL and camelCase in the Drizzle model. Always include an id primary key and a created_at timestamp.`

export function buildMessages(prompt: string): Content[] {
  return [{ role: "user", parts: [{ text: prompt }] }]
}
