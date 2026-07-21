import {
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
