import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import type { GeneratedSchema } from "@/types/schema"

// profiles.id also carries a FOREIGN KEY to auth.users(id) ON DELETE
// CASCADE, added via hand-written SQL in supabase/triggers.sql — Drizzle
// can't express it because auth.users is Supabase-managed, not part of
// this app's migrations.
export const profiles = pgTable("profiles", {
  // No defaultRandom(): this id is not app-generated. It's supplied by
  // auth.users.id (same value, via the handle_new_user trigger), so the
  // FK in supabase/triggers.sql stays valid.
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Maintained by application code on update, not a DB trigger.
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("projects_user_id_idx").on(table.userId)]
)

export const generations = pgTable(
  "generations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    prompt: text("prompt").notNull(),
    artifacts: jsonb("artifacts").notNull().$type<GeneratedSchema>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("generations_project_id_idx").on(table.projectId),
    uniqueIndex("generations_project_id_version_number_idx").on(
      table.projectId,
      table.versionNumber
    ),
  ]
)

// S4-010B (Account Settings): one row per user, created lazily on first
// preference save -- getUserPreferences() returns defaults when absent, so
// no signup-time trigger is needed the way profiles has one. NOT YET
// APPLIED to any database (no migration has been generated or run against
// a live connection; this environment has none) -- schema-adjacent change
// requiring the same explicit sign-off as S4-009's trigger before
// `npm run db:generate && npm run db:migrate` is ever run for real.
export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  defaultDialect: text("default_dialect").notNull().default("postgres"),
  defaultNamingConvention: text("default_naming_convention").notNull().default("snake_case"),
  defaultLandingScreen: text("default_landing_screen").notNull().default("dashboard"),
  reducedMotion: boolean("reduced_motion").notNull().default(false),
  highContrast: boolean("high_contrast").notNull().default(false),
  developerMode: boolean("developer_mode").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// Backs the public, unauthenticated landing-page sandbox (M9) rate limit
// only. No foreign key to any user or project — sandbox activity is never
// linked to real account data, and nothing here is ever a real,
// persisted generation. Written to exclusively via the SECURITY DEFINER
// function in supabase/rls.sql; there is no direct table grant for any
// role, authenticated or anon (see that file for why).
export const sandboxGenerations = pgTable(
  "sandbox_generations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sandbox_generations_ip_hash_idx").on(table.ipHash)]
)
