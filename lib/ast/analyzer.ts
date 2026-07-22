import type { CanonicalSchemaAST, RelationshipNode, TableNode } from "@/lib/ast/types"

// Deterministic semantic analysis of an already shape-valid
// CanonicalSchemaAST (see lib/ast/validator.ts for the shape gate this
// runs after). Every check here is a pure function over the AST: no I/O,
// no exceptions. Problems that make the AST unsafe to compile are
// errors; problems that are only stylistically questionable are
// warnings. Callers decide what to do with each list — this module never
// throws.
//
// Every issue carries a stable `code` from a fixed union (AnalysisErrorCode
// / AnalysisWarningCode) rather than a free-form string, so callers can
// switch on `code` instead of pattern-matching human-readable text. The
// `message` field remains free text for humans/logs, but it is never the
// thing a caller should branch on.

export const AnalysisErrorCode = {
  DuplicateTable: "DUPLICATE_TABLE",
  DuplicateColumn: "DUPLICATE_COLUMN",
  FkSourceTableNotFound: "FK_SOURCE_TABLE_NOT_FOUND",
  FkSourceColumnNotFound: "FK_SOURCE_COLUMN_NOT_FOUND",
  FkTargetTableNotFound: "FK_TARGET_TABLE_NOT_FOUND",
  FkTargetColumnNotFound: "FK_TARGET_COLUMN_NOT_FOUND",
  FkColumnCountMismatch: "FK_COLUMN_COUNT_MISMATCH",
  IndexUnknownColumn: "INDEX_UNKNOWN_COLUMN",
  PrimaryKeyUnknownColumn: "PRIMARY_KEY_UNKNOWN_COLUMN",
  PrimaryKeyConflict: "PRIMARY_KEY_CONFLICT",
  UnsafeExpression: "UNSAFE_EXPRESSION",
} as const
export type AnalysisErrorCode = (typeof AnalysisErrorCode)[keyof typeof AnalysisErrorCode]

export const AnalysisWarningCode = {
  MissingPrimaryKey: "MISSING_PRIMARY_KEY",
  ReservedKeyword: "RESERVED_KEYWORD",
  CircularForeignKey: "CIRCULAR_FOREIGN_KEY",
} as const
export type AnalysisWarningCode = (typeof AnalysisWarningCode)[keyof typeof AnalysisWarningCode]

export interface AnalysisError {
  code: AnalysisErrorCode
  message: string
  table?: string
  column?: string
}

export interface AnalysisWarning {
  code: AnalysisWarningCode
  message: string
  table?: string
  column?: string
}

export interface AnalysisResult {
  valid: boolean
  errors: AnalysisError[]
  warnings: AnalysisWarning[]
}

// Not exhaustive across every SQL dialect — this is a best-effort warning
// list covering ANSI SQL and common Postgres reserved words, since
// dialect-specific quoting is a compiler concern, not an AST concern.
const RESERVED_KEYWORDS = new Set([
  "select", "insert", "update", "delete", "from", "where", "table", "order",
  "group", "by", "join", "left", "right", "inner", "outer", "on", "as",
  "and", "or", "not", "null", "primary", "key", "foreign", "references",
  "unique", "index", "default", "check", "constraint", "create", "alter",
  "drop", "user", "column", "values", "into", "set", "grant", "revoke",
  "cascade", "restrict", "limit", "offset", "distinct", "having", "union",
  "all", "case", "when", "then", "else", "end", "exists", "in", "is",
  "like", "between", "cast", "current_date", "current_time",
  "current_timestamp",
])

export function analyzeSchema(ast: CanonicalSchemaAST): AnalysisResult {
  const errors: AnalysisError[] = []
  const warnings: AnalysisWarning[] = []

  const tablesByName = indexTablesByName(ast.tables, errors)

  for (const table of ast.tables) {
    checkDuplicateColumns(table, errors)
    checkReservedKeyword(table.name, undefined, warnings)
    for (const column of table.columns) {
      checkReservedKeyword(table.name, column.name, warnings)
    }
    checkPrimaryKey(table, errors, warnings)
    checkIndexes(table, errors)
    checkUnsafeExpressions(table, errors)
  }

  for (const relationship of ast.relationships) {
    checkRelationship(relationship, tablesByName, errors)
  }

  checkCircularForeignKeys(ast, warnings)

  return { valid: errors.length === 0, errors, warnings }
}

function indexTablesByName(
  tables: TableNode[],
  errors: AnalysisError[]
): Map<string, TableNode> {
  const tablesByName = new Map<string, TableNode>()

  for (const table of tables) {
    const key = table.name.toLowerCase()
    if (tablesByName.has(key)) {
      errors.push({
        code: AnalysisErrorCode.DuplicateTable,
        message: `Duplicate table "${table.name}".`,
        table: table.name,
      })
      continue
    }
    tablesByName.set(key, table)
  }

  return tablesByName
}

function checkDuplicateColumns(table: TableNode, errors: AnalysisError[]) {
  const seen = new Set<string>()
  for (const column of table.columns) {
    const key = column.name.toLowerCase()
    if (seen.has(key)) {
      errors.push({
        code: AnalysisErrorCode.DuplicateColumn,
        message: `Duplicate column "${column.name}" in table "${table.name}".`,
        table: table.name,
        column: column.name,
      })
      continue
    }
    seen.add(key)
  }
}

function checkReservedKeyword(
  tableName: string,
  columnName: string | undefined,
  warnings: AnalysisWarning[]
) {
  const name = columnName ?? tableName
  if (!RESERVED_KEYWORDS.has(name.toLowerCase())) {
    return
  }

  warnings.push({
    code: AnalysisWarningCode.ReservedKeyword,
    message: columnName
      ? `Column "${columnName}" in table "${tableName}" is a reserved SQL keyword and may need quoting.`
      : `Table "${tableName}" is a reserved SQL keyword and may need quoting.`,
    table: tableName,
    column: columnName,
  })
}

function checkPrimaryKey(
  table: TableNode,
  errors: AnalysisError[],
  warnings: AnalysisWarning[]
) {
  const columnNames = new Set(table.columns.map((column) => column.name.toLowerCase()))
  const columnsFlaggedPrimaryKey = table.columns.filter((column) => column.primaryKey)

  if (!table.primaryKey) {
    if (columnsFlaggedPrimaryKey.length === 0) {
      warnings.push({
        code: AnalysisWarningCode.MissingPrimaryKey,
        message: `Table "${table.name}" has no primary key defined.`,
        table: table.name,
      })
    }
    return
  }

  for (const column of table.primaryKey.columns) {
    if (!columnNames.has(column.toLowerCase())) {
      errors.push({
        code: AnalysisErrorCode.PrimaryKeyUnknownColumn,
        message: `Primary key on table "${table.name}" references unknown column "${column}".`,
        table: table.name,
        column,
      })
    }
  }

  const primaryKeyColumns = new Set(table.primaryKey.columns.map((c) => c.toLowerCase()))
  const conflicting = columnsFlaggedPrimaryKey.filter(
    (column) => !primaryKeyColumns.has(column.name.toLowerCase())
  )
  if (conflicting.length > 0) {
    errors.push({
      code: AnalysisErrorCode.PrimaryKeyConflict,
      message: `Table "${table.name}" declares a table-level primary key that conflicts with column-level primaryKey flags (${conflicting
        .map((column) => column.name)
        .join(", ")}).`,
      table: table.name,
    })
  }
}

function checkIndexes(table: TableNode, errors: AnalysisError[]) {
  const columnNames = new Set(table.columns.map((column) => column.name.toLowerCase()))

  for (const index of table.indexes ?? []) {
    for (const column of index.columns) {
      if (!columnNames.has(column.toLowerCase())) {
        errors.push({
          code: AnalysisErrorCode.IndexUnknownColumn,
          message: `Index "${index.name}" on table "${table.name}" references unknown column "${column}".`,
          table: table.name,
          column,
        })
      }
    }
  }
}

// `expression` defaults and `check` constraints are opaque, dialect-specific
// strings (see lib/ast/schema.ts) that compilers splice verbatim into
// generated SQL (DEFAULT/CHECK clauses). They come from the AI's JSON
// output over free-text user prompts, which this app does not treat as
// trusted input, so a statement terminator or comment marker here would
// let a crafted prompt smuggle an extra statement into the generated SQL
// artifact. Legitimate single-expression SQL never needs these, so
// rejecting them outright is not a false-positive risk worth tolerating.
const UNSAFE_EXPRESSION_PATTERN = /;|--|\/\*|\*\//

function checkUnsafeExpressions(table: TableNode, errors: AnalysisError[]) {
  for (const column of table.columns) {
    if (
      column.default?.kind === "expression" &&
      UNSAFE_EXPRESSION_PATTERN.test(column.default.expression)
    ) {
      errors.push({
        code: AnalysisErrorCode.UnsafeExpression,
        message: `Default expression for column "${column.name}" in table "${table.name}" contains a statement terminator or comment marker, which is not allowed.`,
        table: table.name,
        column: column.name,
      })
    }
  }

  for (const constraint of table.constraints ?? []) {
    if (constraint.kind === "check" && UNSAFE_EXPRESSION_PATTERN.test(constraint.expression)) {
      errors.push({
        code: AnalysisErrorCode.UnsafeExpression,
        message: `Check constraint${
          constraint.name ? ` "${constraint.name}"` : ""
        } on table "${table.name}" contains a statement terminator or comment marker, which is not allowed.`,
        table: table.name,
      })
    }
  }
}

function checkRelationship(
  relationship: RelationshipNode,
  tablesByName: Map<string, TableNode>,
  errors: AnalysisError[]
) {
  const sourceTable = tablesByName.get(relationship.sourceTable.toLowerCase())
  const targetTable = tablesByName.get(relationship.targetTable.toLowerCase())

  if (!sourceTable) {
    errors.push({
      code: AnalysisErrorCode.FkSourceTableNotFound,
      message: `Relationship references unknown source table "${relationship.sourceTable}".`,
      table: relationship.sourceTable,
    })
  } else {
    const sourceColumns = new Set(sourceTable.columns.map((c) => c.name.toLowerCase()))
    for (const column of relationship.sourceColumns) {
      if (!sourceColumns.has(column.toLowerCase())) {
        errors.push({
          code: AnalysisErrorCode.FkSourceColumnNotFound,
          message: `Relationship on "${relationship.sourceTable}" references unknown source column "${column}".`,
          table: relationship.sourceTable,
          column,
        })
      }
    }
  }

  if (!targetTable) {
    errors.push({
      code: AnalysisErrorCode.FkTargetTableNotFound,
      message: `Relationship references unknown target table "${relationship.targetTable}".`,
      table: relationship.targetTable,
    })
  } else {
    const targetColumns = new Set(targetTable.columns.map((c) => c.name.toLowerCase()))
    for (const column of relationship.targetColumns) {
      if (!targetColumns.has(column.toLowerCase())) {
        errors.push({
          code: AnalysisErrorCode.FkTargetColumnNotFound,
          message: `Relationship on "${relationship.targetTable}" references unknown target column "${column}".`,
          table: relationship.targetTable,
          column,
        })
      }
    }
  }

  if (relationship.sourceColumns.length !== relationship.targetColumns.length) {
    errors.push({
      code: AnalysisErrorCode.FkColumnCountMismatch,
      message: `Relationship "${
        relationship.name ?? `${relationship.sourceTable}->${relationship.targetTable}`
      }" has mismatched source/target column counts.`,
      table: relationship.sourceTable,
    })
  }
}

// Cycle detection over the directed graph of table -> referenced table
// (one edge per relationship). Reported as a warning, not an error,
// because circular FKs are sometimes intentional (e.g. deferred
// constraints) and are not inherently invalid.
function checkCircularForeignKeys(ast: CanonicalSchemaAST, warnings: AnalysisWarning[]) {
  const graph = new Map<string, Set<string>>()
  for (const table of ast.tables) {
    graph.set(table.name.toLowerCase(), new Set())
  }
  for (const relationship of ast.relationships) {
    const from = relationship.sourceTable.toLowerCase()
    const to = relationship.targetTable.toLowerCase()
    if (graph.has(from) && graph.has(to)) {
      graph.get(from)!.add(to)
    }
  }

  const visited = new Set<string>()
  const onStack = new Set<string>()
  const stack: string[] = []
  const reportedCycles = new Set<string>()

  function visit(node: string) {
    visited.add(node)
    onStack.add(node)
    stack.push(node)

    for (const neighbor of graph.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        visit(neighbor)
      } else if (onStack.has(neighbor)) {
        const cycleStart = stack.indexOf(neighbor)
        const cyclePath = [...stack.slice(cycleStart), neighbor]
        const cycleKey = [...new Set(cyclePath)].sort().join(",")
        if (!reportedCycles.has(cycleKey)) {
          reportedCycles.add(cycleKey)
          warnings.push({
            code: AnalysisWarningCode.CircularForeignKey,
            message: `Circular foreign key relationship detected: ${cyclePath.join(" -> ")}.`,
          })
        }
      }
    }

    stack.pop()
    onStack.delete(node)
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      visit(node)
    }
  }
}
