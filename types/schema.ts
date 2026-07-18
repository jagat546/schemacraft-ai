import { z } from "zod"

export const generatedSchemaSchema = z.object({
  sql: z.string(),
  drizzle: z.string(),
  json: z.string(),
})

export type GeneratedSchema = z.infer<typeof generatedSchemaSchema>
