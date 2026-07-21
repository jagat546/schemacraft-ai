import { readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import postgres from "postgres"

// Applies the hand-written Supabase SQL (triggers, RLS policies, and
// baseline table grants) that Drizzle's migrations can't express, since
// Drizzle only owns schema/relations/migrations/types (see ARCHITECTURE.md
// ADR-002). Run after `drizzle-kit migrate` — see the db:setup script in
// package.json, which chains both. Every file here is written to be safe
// to re-run (drop-then-create policies/trigger, GRANT is a no-op if
// already applied), so this script is idempotent as a whole.

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const supabaseDir = path.join(__dirname, "..", "supabase")

// Explicit, meaningful order: the trigger/FK to auth.users first, then
// RLS policies (which assume profiles/projects/generations already exist
// and reference each other via the FKs Drizzle's migration created).
const FILES_IN_ORDER = ["triggers.sql", "rls.sql"]

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error("DATABASE_URL is not set.")
  process.exit(1)
}

const filesOnDisk = new Set(readdirSync(supabaseDir))
for (const file of FILES_IN_ORDER) {
  if (!filesOnDisk.has(file)) {
    console.error(`Expected supabase/${file} to exist but it was not found.`)
    process.exit(1)
  }
}

const sql = postgres(connectionString, { prepare: false })

try {
  for (const file of FILES_IN_ORDER) {
    const filePath = path.join(supabaseDir, file)
    console.log(`Applying supabase/${file} ...`)
    await sql.file(filePath)
  }
  console.log("Supabase SQL applied successfully.")
} catch (error) {
  console.error("Failed to apply Supabase SQL:")
  console.error(error)
  process.exitCode = 1
} finally {
  await sql.end({ timeout: 5 })
}
