import { relations } from "drizzle-orm"

import { generations, profiles, projects } from "./schema"

export const profilesRelations = relations(profiles, ({ many }) => ({
  projects: many(projects),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [projects.userId],
    references: [profiles.id],
  }),
  generations: many(generations),
}))

export const generationsRelations = relations(generations, ({ one }) => ({
  project: one(projects, {
    fields: [generations.projectId],
    references: [projects.id],
  }),
}))
