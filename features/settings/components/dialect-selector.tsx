"use client"

import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Backend-gated shell (Engineering Spec §2 #11): lib/compiler/sql is
// Postgres-only today, there is no dialect abstraction in the compiler
// layer. Disabled here rather than hidden, and explicitly labeled, so the
// control never silently does nothing when clicked.
export function DialectSelector() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">SQL Dialect</span>
        <Badge variant="secondary">Coming soon</Badge>
      </div>
      <Select value="postgres" disabled>
        <SelectTrigger aria-label="SQL dialect (coming soon)" className="w-full sm:w-64">
          <SelectValue>PostgreSQL</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="postgres">PostgreSQL</SelectItem>
          <SelectItem value="mysql" disabled>
            MySQL
          </SelectItem>
          <SelectItem value="sqlite" disabled>
            SQLite
          </SelectItem>
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        Every project generates PostgreSQL today. MySQL and SQLite output are planned but not
        yet built.
      </p>
    </div>
  )
}
