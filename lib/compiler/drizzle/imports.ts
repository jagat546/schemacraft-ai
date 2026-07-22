export interface ImportPlan {
  pgCoreImports: Set<string>
  needsSql: boolean
  needsRelations: boolean
  needsBytea: boolean
}

export function renderImports(plan: ImportPlan): string {
  const lines: string[] = []

  const pgCoreNames = new Set(plan.pgCoreImports)
  if (plan.needsBytea) {
    pgCoreNames.add("customType")
  }
  if (pgCoreNames.size > 0) {
    lines.push(`import { ${[...pgCoreNames].sort().join(", ")} } from "drizzle-orm/pg-core"`)
  }

  const drizzleCoreNames = new Set<string>()
  if (plan.needsRelations) {
    drizzleCoreNames.add("relations")
  }
  if (plan.needsSql) {
    drizzleCoreNames.add("sql")
  }
  if (drizzleCoreNames.size > 0) {
    lines.push(`import { ${[...drizzleCoreNames].sort().join(", ")} } from "drizzle-orm"`)
  }

  return lines.join("\n")
}
