# Sprint 5 — Canonical Schema AST & Compiler Pipeline

Status: **Complete and live.** `lib/services/generation.service.ts` now
runs the full AST pipeline — Gemini produces only a `CanonicalSchemaAST`
(`lib/ai/providers/gemini.ts`), which is shape-validated, semantically
analyzed, compiled by all five registered compilers, and persisted. The
old "Gemini produces SQL/Drizzle/JSON/docs/Mermaid directly in one
response" pipeline (`lib/ai/generate.ts`, `lib/ai/parse-response.ts`,
`lib/ai/prompts.ts`) has been deleted — this is now the only runtime
path, not an unused parallel foundation.

## Why this change

Through Sprint 4, an AI call directly produced every output artifact —
SQL, a Drizzle model, sample JSON, documentation, a Mermaid diagram — all
in one response, validated only by a Zod schema over the *final text*
(`types/schema.ts::generatedSchemaSchema`). That means:

- Every artifact is only as consistent as the model's ability to keep five
  representations of the same schema in sync inside one response.
- There is no single point that "knows" the schema — a bug in the SQL and
  a bug in the Drizzle model are two independent failure modes, not one.
- Semantic mistakes (a foreign key pointing at a table that doesn't
  exist, a duplicate column) are invisible until a human reads the
  generated SQL, or until Postgres rejects it.

Sprint 5 replaces this with a compiler pipeline: the AI produces exactly
one artifact — a **Canonical Schema AST** — and everything else
(SQL, Drizzle, JSON, docs, diagrams) is produced from that AST by
deterministic compilers. This is the same shift as replacing "the
service layer builds five different response formats by hand" with "the
service layer builds one domain object, and five serializers render it."

## AST philosophy

The Canonical Schema AST (`lib/ast/schema.ts` / `lib/ast/types.ts`) is a
**database-agnostic** description of a schema design: tables, columns,
relationships (foreign keys), indexes, table-level constraints, defaults,
nullability, uniqueness, and primary keys. It intentionally has no
concept of "Postgres" or "MySQL" or "Drizzle" — those are compiler
concerns.

Two design rules keep it that way:

1. **No dialect leakage into the required shape.** Where a concept is
   genuinely dialect-specific (a `CHECK` expression string, a raw
   `expression` default), it's represented as an opaque string, not
   interpreted by the AST layer itself.
2. **`extensions?: Record<string, unknown>`** is present on every node
   that plausibly needs dialect-specific metadata later (tables, columns,
   relationships, indexes, and the AST root). This is the escape hatch:
   a future Postgres compiler might read `column.extensions.postgres.generatedAs`
   without the AST core ever needing to know that key exists. No compiler
   reads `extensions` yet — it exists so later dialect features don't
   require widening the core AST shape.

The AST is defined once, as Zod schemas (`lib/ast/schema.ts`), with
TypeScript types derived via `z.infer`. `lib/ast/types.ts` re-exports
those types for consumers that want the type without importing Zod.
There is deliberately only one definition — a hand-written `interface`
that duplicates the Zod shape would drift from it over time, the same
way a hand-maintained DTO and its JSON schema drift if edited separately.

## AST versioning

`CanonicalSchemaAST.astVersion` (`lib/ast/schema.ts`) versions the *shape
of the AST itself* — independent of the app's `package.json` version or
any Sprint number. Two constants back it:

```ts
export const CURRENT_AST_VERSION = "1.0.0"
export const SUPPORTED_AST_VERSIONS: readonly string[] = [CURRENT_AST_VERSION]
```

`validateASTShape` (`lib/ast/validator.ts`) rejects any input whose
`astVersion` is not in `SUPPORTED_AST_VERSIONS`, even if the rest of the
document is structurally valid Zod-wise. This is the same reasoning as
versioning a wire format between services: the day the AST shape needs a
breaking change (e.g. relationships gaining a required field), a second
version is added to `SUPPORTED_AST_VERSIONS` and a migration path is
written, instead of silently trying to compile a document the current
compilers don't actually understand.

## Validation pipeline

Validation happens in two distinct passes, run in order:

```
unknown (AI output, JSON)
   │
   ▼
1. Shape validation — lib/ast/validator.ts
   Zod schema.safeParse() + astVersion check against SUPPORTED_AST_VERSIONS.
   "Is this even a CanonicalSchemaAST, of a version we can compile?"
   │  (only reachable with a structurally valid, version-supported AST)
   ▼
2. Semantic analysis — lib/ast/analyzer.ts
   Pure, deterministic checks over a shape-valid AST. "Does this AST make sense?"
   Returns an AnalysisResult — never throws.
   │
   ▼
CanonicalSchemaAST considered safe to compile (if result.valid === true)
```

This mirrors a two-phase validation you'd recognize from request
handling: a schema/DTO validation layer that rejects malformed or
wrong-version payloads, followed by a business-rule layer that can
reject or merely warn about a structurally valid payload (e.g. "this
order references a customer ID that doesn't exist").

**Shape validation** (`validateASTShape`) only checks that the JSON
matches the AST's structure and declares a supported version. It cannot
know whether a foreign key's target table exists, because that requires
looking across the whole AST, not just at one node in isolation.

### Analysis result model

`analyzeSchema` (`lib/ast/analyzer.ts`) returns an `AnalysisResult`:

```ts
interface AnalysisResult {
  valid: boolean          // === errors.length === 0
  errors: AnalysisError[]
  warnings: AnalysisWarning[]
}

interface AnalysisError {
  code: AnalysisErrorCode   // stable, typed — not a free-form string
  message: string           // human-readable detail, for logs/UI only
  table?: string
  column?: string
}
// AnalysisWarning is the same shape, keyed by AnalysisWarningCode instead.
```

`code` is the field a caller should ever branch on (`switch`,
`===`, lookup tables for translated user-facing copy); `message` is not
guaranteed stable and should never be pattern-matched. Both code unions
are closed, const-object-backed enums, so adding a new check means adding
a new member to `AnalysisErrorCode`/`AnalysisWarningCode`, not inventing
a new ad hoc string at the call site:

| `AnalysisErrorCode` | Why it's an error |
|---|---|
| `DUPLICATE_TABLE` | Two tables can't share a name |
| `DUPLICATE_COLUMN` | Two columns can't share a name within a table |
| `FK_SOURCE_TABLE_NOT_FOUND` | Relationship's own table doesn't exist |
| `FK_SOURCE_COLUMN_NOT_FOUND` | Relationship's own column doesn't exist |
| `FK_TARGET_TABLE_NOT_FOUND` | A dangling reference can't compile to valid SQL |
| `FK_TARGET_COLUMN_NOT_FOUND` | Same reason, one level deeper |
| `FK_COLUMN_COUNT_MISMATCH` | A composite FK with mismatched arity is malformed |
| `INDEX_UNKNOWN_COLUMN` | Same class of dangling-reference problem |
| `PRIMARY_KEY_UNKNOWN_COLUMN` | Same class of problem |
| `PRIMARY_KEY_CONFLICT` | Table-level PK disagrees with column-level `primaryKey` flags |
| `UNSAFE_EXPRESSION` | A `default: { kind: "expression" }` or `check` constraint string contains `;`, `--`, `/*`, or `*/` — these are spliced verbatim into generated SQL, so a statement terminator or comment marker would let a crafted prompt smuggle an extra statement into the generated artifact |

| `AnalysisWarningCode` | Why it's only a warning |
|---|---|
| `MISSING_PRIMARY_KEY` | Often a mistake, not always (e.g. pure join tables) |
| `RESERVED_KEYWORD` | Will need quoting in some dialects; not invalid AST (the SQL compiler quotes everything, so this never blocks compilation) |
| `CIRCULAR_FOREIGN_KEY` | Sometimes intentional (deferred constraints); flagged, not rejected |

Nothing in the analyzer throws; callers (a future Server Action or
service) decide what `valid === false` means for their flow (e.g. block
persistence, but still show warnings to the user).

## Why the AI only generates the AST

Constraining the AI's output surface to one artifact, validated by one
schema, has a direct effect on failure modes:

- **One shape to get right, not five.** The model's structured-output
  constraint (`responseJsonSchema`) targets the AST schema instead of a
  bespoke `{ sql, drizzle, json, documentation?, mermaidDiagram? }`
  contract, so there's one place a malformed response can be rejected,
  not five independent ones.
- **Consistency by construction.** SQL and the Drizzle model can no
  longer disagree with each other, because neither is generated
  directly — both are compiled from the same AST in the same run.
- **Deterministic re-compilation.** Once an AST is persisted, every
  artifact can be regenerated from it without another AI call — useful
  for fixing a compiler bug retroactively, or adding a new target
  (e.g. a Prisma compiler) without re-prompting the model for schemas
  that already exist.
- **Semantic validation becomes possible at all.** "Does this foreign
  key point at a real table?" is a well-defined, checkable question
  against an AST. It is not a well-defined question against a raw SQL
  string without parsing it back out.

The AI provider contract lives at `lib/ai/providers/interface.ts`
(`AIProviderAdapter.generateAST()`) — moved there in Phase 2 from its
original Phase 1 location (`lib/ai/provider-adapter.ts`) to leave room
for multiple provider implementations under `lib/ai/providers/`.
`lib/ai/providers/gemini.ts` (the Final Phase) is the first one:
`geminiProvider` implements `AIProviderAdapter` by calling Gemini with
`responseJsonSchema` constrained to `canonicalSchemaASTSchema` and
returning the parsed JSON as a `CanonicalSchemaAST` — nothing else.
`lib/ai/client.ts` (the shared `GoogleGenAI` instance) is the only
pre-existing AI file this provider reuses; the old direct-generation
files (`generate.ts`, `prompts.ts`, `parse-response.ts`) are gone (see
"Legacy removal" below) — Gemini has no code path left that produces
anything other than an AST.

## Compiler architecture

```
CanonicalSchemaAST
   │
   ├──▶ CompilerRegistry.get(id) ──▶ SchemaCompiler.compile(ast, options?) ──▶ CompilerResult<TOutput>
   │
   └──▶ CompilerRegistry.compileAll(ast, options?) ──▶ CompileAllResult[]
                                                         [{ id, result }, ...]
                                                         (runs every registered compiler)
```

- **`SchemaCompiler<TOutput>`** (`lib/compiler/types.ts`) — one compiler,
  one target (`id` + `targetLanguage`), a single `compile(ast, options?)`
  method. A compiler never calls the AI and never mutates the AST it's
  given.
- **`CompilerOptions`** — a small, generic bag (`dialect`, `pretty`, and
  an `extensions` escape hatch) so a compiler can be configured without
  the registry or the AST needing to know about dialect-specific knobs.
- **`CompilerResult<TOutput>`** — mirrors the `{ ok, ... }` result shape
  already used throughout the codebase (`RepositoryResult`,
  `GenerateAndPersistResult`), so compiler call sites can pattern-match
  the same way existing service/repository call sites do.

### Compiler IDs

`CompilerId` (`lib/compiler/types.ts`) is a closed, const-object-backed
union of every known compiler target — the registry key and the `id` a
`SchemaCompiler` declares are both typed as `CompilerId`, so a typo in an
id string is a compile-time error, not a silent registry miss. All five
are now implemented:

```ts
CompilerId.PostgresSql    // "sql.postgres"    — lib/compiler/sql
CompilerId.Drizzle        // "drizzle"         — lib/compiler/drizzle
CompilerId.JsonSample     // "json.sample"     — lib/compiler/json
CompilerId.MarkdownDocs   // "docs.markdown"   — lib/compiler/markdown
CompilerId.MermaidDiagram // "diagram.mermaid" — lib/compiler/mermaid
```

### `CompilerRegistry`, `compileAll()`, and `createCompilerRegistry()`

`CompilerRegistry` (`lib/compiler/registry.ts`) is a plain register/get/
list map from `CompilerId` to `SchemaCompiler` instance. It still has no
compilers pre-registered in the class itself — but `lib/compiler/index.ts`
now exports `createCompilerRegistry()`, a factory that returns a fresh
registry with all five implemented compilers registered:

```ts
import { createCompilerRegistry, CompilerId } from "@/lib/compiler"

const registry = createCompilerRegistry()
const results = registry.compileAll(ast)
// [
//   { id: "sql.postgres",    result: { ok: true, output: "CREATE TABLE ..." } },
//   { id: "drizzle",         result: { ok: true, output: "import { ... } from \"drizzle-orm/pg-core\"..." } },
//   { id: "json.sample",     result: { ok: true, output: "{\n  \"users\": [...] }" } },
//   { id: "docs.markdown",   result: { ok: true, output: "# Schema Documentation..." } },
//   { id: "diagram.mermaid", result: { ok: true, output: "erDiagram..." } },
// ]
```

`createCompilerRegistry()` is a factory, not a module-level singleton —
importing `lib/compiler` has no side effects; a registry only comes into
existence when something calls it, which `generation.service.ts` does on
every generation (see "The runtime pipeline" below).

`compileAll(ast, options?)` runs every registered compiler against the
same AST and options, returning one `CompileAllResult` (`{ id, result }`)
per compiler. Compilers are independent of each other: one compiler's
`{ ok: false, errors }` does not stop the others from running, since
failure is represented inside each `CompilerResult`, not thrown.

### Shared helpers (`lib/compiler/shared`)

Four of the five compilers (all but SQL, which only needs the primary
key) independently need to answer the same questions about a table:
"what is its effective primary key," "is this column part of a
single-column unique constraint," "which relationships does this table
source." Rather than reimplement that per compiler (and risk them
silently disagreeing), it lives in two small, pure modules:

- `resolve-primary-key.ts` — `resolvePrimaryKeyColumns(table)`: table-level
  `primaryKey` wins when present, otherwise falls back to columns with
  `primaryKey: true`. Used by SQL, Drizzle, Markdown, and Mermaid.
- `column-flags.ts` — `isPrimaryKeyColumn`, `isSingleColumnUnique`,
  `relationshipsBySourceTable`, `isForeignKeySourceColumn`. Used by
  Drizzle (FK-aware column rendering) and Mermaid (PK/FK/UK tags).

## The SQL compiler (`lib/compiler/sql`)

The reference implementation: `postgresSqlCompiler`, registered under
`CompilerId.PostgresSql` ("sql.postgres"). It is a pure function —
`CanonicalSchemaAST → string` — split across small, individually
testable render functions:

| File | Responsibility |
|---|---|
| `identifiers.ts` | `quoteIdentifier` (always double-quotes), `escapeStringLiteral` (doubles embedded `'`) |
| `type-map.ts` | `mapColumnType` — the *only* place a canonical `ColumnType` becomes a Postgres type keyword |
| `render-column.ts` | One column line: type, nullability, default/identity, uniqueness, enum `CHECK` |
| `render-table.ts` | One `CREATE TABLE` statement: columns, resolved primary key, table-level constraints |
| `render-index.ts` | `CREATE [UNIQUE] INDEX` statements for one table |
| `render-relationship.ts` | `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY` statements |
| `postgres-compiler.ts` | Orchestrates the above into the final `SchemaCompiler` |

Determinism guarantees, by construction:

- **Output order always follows AST array order** — tables in
  `ast.tables` order, each table's indexes in that table's `indexes`
  order, relationships in `ast.relationships` order. Nothing iterates
  `Object.keys()`/`Map` insertion order for anything the caller doesn't
  control, so the same AST always produces byte-identical SQL.
- **Every identifier is quoted** (`"table_name"`, `"column_name"`),
  sidestepping the analyzer's `RESERVED_KEYWORD` warning at the compiler
  level — a quoted identifier is never ambiguous with a keyword.
- **Foreign keys are emitted as `ALTER TABLE` statements after every
  `CREATE TABLE`**, not inlined into table bodies, so a relationship can
  reference a table declared earlier or later in `ast.tables` without
  the compiler needing to topologically sort tables first.
- **`enum` columns compile to `TEXT` + a `CHECK (col IN (...))`
  constraint**, not a native Postgres `ENUM` type — a native enum needs
  a separate `CREATE TYPE`/`ALTER TYPE` statement pair, which is one
  more moving part than a first compiler needs. This choice lives only
  in `type-map.ts` and can change later without touching the AST.
- **`autoincrement` defaults compile to `GENERATED BY DEFAULT AS
  IDENTITY`**, a column constraint, not a `DEFAULT` clause — Postgres has
  no bare default expression for autoincrement.
- **`uuid` defaults compile to `DEFAULT gen_random_uuid()`**, which
  requires the `pgcrypto` extension (already enabled on Supabase; `create
  extension if not exists pgcrypto;` otherwise).

Every compiler below shares this same purity/determinism guarantee: no
network calls, no filesystem access, no mutation of the `ast` argument,
no hidden state between calls, and — critically — no `Math.random()`,
no `Date.now()`/`new Date()`, no other non-deterministic input. The same
`CanonicalSchemaAST` in always produces the same output out. That's what
makes every one of them straightforward to unit test later (`AST in →
string out`, no mocking required); this sprint does not add a test
runner to the project, since none exists yet (`package.json` has no test
script) and introducing one is a separate decision. Verification so far
has been manual: a throwaway script (written, run, and deleted — not
committed) exercised all five compilers together against a sample AST
covering a composite primary key, a table-level unique constraint, a
check constraint, a one-to-one relationship, an enum column, and a
binary column, confirming valid output and that calling a compiler twice
on the same AST produces byte-identical results. The generated Drizzle
output was additionally written to a real `.ts` file and type-checked
against this project's actual `drizzle-orm` dependency to confirm it's
not just plausible-looking text but code that actually compiles.

## The Drizzle compiler (`lib/compiler/drizzle`)

`drizzleCompiler`, registered under `CompilerId.Drizzle` ("drizzle").
Targets drizzle-orm 0.45.x — the version this project depends on — and
matches this project's own `lib/db/schema.ts` / `lib/db/relations.ts`
conventions exactly (verified by generating a model from a sample AST
and diffing its shape against the hand-written files): snake_case
column-name string arguments, camelCase property names, the
`pgTable(name, columns, (table) => [...builders])` 3-argument array form
for tables with indexes/composite-PK/table-level constraints (2-argument
form otherwise), and a separate `relations()` block per table.

| File | Responsibility |
|---|---|
| `identifiers.ts` | `toCamelCase` — snake_case AST name -> camelCase binding/property name |
| `type-map.ts` | `buildColumnBuilder` — the *only* place a canonical `ColumnType` becomes a pg-core builder call |
| `render-column.ts` | One column property: builder, `primaryKey()`/`notNull()`/`references()`/`unique()`, default |
| `render-table.ts` | One `pgTable()` definition: 2-arg vs 3-arg form, composite PK, table-level unique/check, indexes |
| `render-relations.ts` | `relations()` blocks (both "one" and "many" sides of every relationship) |
| `imports.ts` | Assembles a deduplicated, sorted `import` statement per source module actually used |
| `drizzle-compiler.ts` | Orchestrates the above into the final `SchemaCompiler` |

Notable decisions, several deliberately mirroring the SQL compiler for
cross-compiler consistency:

- **`enum` columns compile to `text()`**, same reasoning as the SQL
  compiler (no `pgEnum`/`CREATE TYPE` management for a first pass) — with
  a `// col: one of "a", "b"` comment above the property so the allowed
  values aren't silently lost, since Drizzle has no equivalent of the SQL
  compiler's inline `CHECK` for this case.
- **`binary` columns get a local `customType<{ data: Buffer }>({ dataType: () => "bytea" })`
  helper**, emitted once at the top of the file only when at least one
  binary column exists — pg-core has no built-in bytea builder.
- **`autoincrement` defaults compile to `.generatedByDefaultAsIdentity()`**,
  a column-builder method, not `.default(...)` — parallels the SQL
  compiler's `GENERATED BY DEFAULT AS IDENTITY`.
- **Single-column relationships get an inline `.references(() => target.col, { onDelete, onUpdate })`**
  on the source column (a real, physical FK constraint) *and* a
  `relations()` entry. **Composite (multi-column) relationships get a
  `relations()` entry only** — no physical constraint. This is a
  deliberate scope cut: Drizzle's table-level `foreignKey({ columns,
  foreignColumns })` builder needs a *direct* reference to another
  table's already-initialized columns at the point it runs, which would
  only be safe if tables were emitted in dependency order (and safe
  *at all* if `ast.relationships` had a cycle, which the analyzer only
  warns about, never blocks). The inline single-column `.references(() =>
  ...)` form sidesteps this entirely because the arrow function defers
  the property access — exactly why the project's own `schema.ts` already
  uses that form. Rather than add topological sorting to handle a rarer
  composite-FK case, composite relationships are represented at the
  query layer (`relations()`) only, and this is called out here so it
  isn't mistaken for an oversight.
- **`relations()` blocks are always emitted after every `pgTable()`
  const**, regardless of `ast.tables` order, so a relationship can point
  at a table declared earlier or later without a temporal-dead-zone
  hazard.
- **Duplicate relation keys are disambiguated** (e.g. two FKs from the
  same table to the same target table) by suffixing repeats with an
  occurrence count (`profiles`, `profiles2`, ...) — simple and
  deterministic, if not the prettiest possible name.

## The JSON sample compiler (`lib/compiler/json`)

`jsonSampleCompiler`, registered under `CompilerId.JsonSample`
("json.sample"). Produces `{ [tableName]: sampleRow[] }` — a fixed
**3 rows per table** — for every table in the AST.

| File | Responsibility |
|---|---|
| `value-generator.ts` | `generateBaseValue(column, rowIndex, rowCount)` — one placeholder value, ignoring relationships |
| `sample-rows.ts` | `buildBaseRows(table)` — applies the generator across a table's columns and the fixed row count |
| `apply-relationships.ts` | Overwrites FK columns in-place with real values from the referenced table's rows |
| `json-compiler.ts` | Orchestrates the above into the final `SchemaCompiler` |

How "nested relationships represented logically" is implemented,
without needing a topological sort over `ast.tables`:

1. **Pass 1** (`buildBaseRows`): every table's rows are generated
   independently, purely as a function of `(column, rowIndex, rowCount)`
   — including FK columns, which get a normal type-shaped placeholder
   at this stage. No table depends on any other table's rows yet.
2. **Pass 2** (`applyRelationships`): for each relationship, each source
   row's FK column(s) are overwritten with the corresponding target
   row's actual value(s), cycling through the target table's rows
   (`rowIndex % targetRows.length`). Because pass 1 already produced
   *every* table's rows up front, it doesn't matter whether a
   relationship's target table appears earlier or later in `ast.tables`,
   or even if `ast.relationships` contains a cycle.

Determinism comes from what `value-generator.ts` deliberately never
calls: no `Math.random()`, no `Date.now()`/`new Date()`, no crypto RNG.
UUID-typed columns get a UUID-*shaped* placeholder from a small FNV-1a
string hash seeded by `${columnName}:${rowIndex}` — not a real UUID,
just a deterministic, syntactically valid stand-in. Dates/timestamps are
fixed, hand-picked strings (`2024-01-0N`), never the real current date.
The **last** row of any nullable column with no default is always
`null` — deterministically (always that row, never a random one) — to
demonstrate the column is genuinely optional. A column with a `literal`
default always uses that literal value, on every row, rather than a
generated placeholder.

## The Markdown docs compiler (`lib/compiler/markdown`)

`markdownDocsCompiler`, registered under `CompilerId.MarkdownDocs`
("docs.markdown"). Columns, indexes, and constraints are nested *inside*
each table's own section rather than broken out as separate top-level
documents — a column list is meaningless without the table name for
context, and nesting is what makes this "readable technical
documentation" rather than four disconnected lists side by side.
Relationships are cross-table by nature, so they get their own
top-level section after all table sections.

| File | Responsibility |
|---|---|
| `format-default.ts` | `formatDefaultForDocs` — human-readable rendering of a `ColumnDefault` |
| `render-table-section.ts` | One table's `## <name>` section: columns table, indexes list, constraints list |
| `render-relationships-section.ts` | The global `## Relationships` section |
| `markdown-compiler.ts` | Overview, table of contents, and orchestration of the above |

Output structure: `# Schema Documentation` (with `astVersion` and a
table/relationship count) → `## Table of Contents` (linking to each
table's anchor) → one `## <table>` section per table → `## Relationships`.

## The Mermaid ER diagram compiler (`lib/compiler/mermaid`)

`mermaidDiagramCompiler`, registered under `CompilerId.MermaidDiagram`
("diagram.mermaid"). Produces a single `erDiagram` block.

| File | Responsibility |
|---|---|
| `type-map.ts` | `mapToMermaidType` — canonical `ColumnType` -> a coarse, human-readable Mermaid type keyword |
| `identifiers.ts` | `sanitizeMermaidIdentifier` — defensively strips characters Mermaid identifiers can't contain |
| `render-entity.ts` | One entity block, with a PK/FK/UK tag per attribute |
| `render-relationship.ts` | One relationship line, with inferred cardinality |
| `mermaid-compiler.ts` | Orchestrates the above into the final `SchemaCompiler` |

Two things the AST doesn't store outright and this compiler infers
instead:

- **Constraint tag priority.** A column shows at most one tag —
  `PK` beats `FK` beats `UK` — because Mermaid's ER syntax supports one
  key per attribute line officially; combining tags risks being
  unsupported by a given renderer.
- **Cardinality.** The AST models a relationship as source
  columns/target columns, not as an explicit "one-to-many" vs
  "many-to-many" label. The target side is always rendered as "exactly
  one" (`||`) — standard FK semantics: a FK value identifies exactly one
  target row. The source side is "exactly one" (`||`, i.e. one-to-one)
  only when every source column is individually unique
  (`isSingleColumnUnique`); otherwise it's "zero-or-many" (`o{`), i.e. a
  plain one-to-many. There's no dedicated many-to-many representation,
  because the AST has none either — that's normally modeled as two
  separate FKs through a join table, and each one already renders
  correctly as its own one-to-many relationship line.

## The runtime pipeline (`lib/services/generation.service.ts`)

`generateAndPersistSchema` is now the orchestration layer the acceptance
criteria describe, end to end:

```
requireOwnership (getProjectById)
   │
   ▼
geminiProvider.generateAST(prompt)      — lib/ai/providers/gemini.ts
   │
   ▼
validateASTShape(ast)                   — lib/ast/validator.ts
   │
   ▼
analyzeSchema(ast)                      — lib/ast/analyzer.ts
   │
   ▼
createCompilerRegistry().compileAll(ast) — lib/compiler
   │
   ▼
buildGeneratedArtifacts(compiled)       — maps CompileAllResult[] -> GeneratedSchema
   │
   ▼
createGeneration(...)                   — lib/repositories/generation.repository.ts (unchanged)
   │
   ▼
GenerateAndPersistResult
```

Each stage returns as soon as it fails, and each failure mode gets its
own status — this is what "differentiate AI generation failure /
invalid AST / semantic validation failure / compiler failure /
persistence failure" means concretely:

| Stage | Failure status | What it means |
|---|---|---|
| Ownership check | `PROJECT_NOT_FOUND` | Project doesn't exist or isn't owned by the caller (unchanged from before) |
| `geminiProvider.generateAST()` | `AI_ERROR` | The Gemini call itself failed: blocked, cut off, network/API error, or the response text wasn't even parseable JSON |
| `validateASTShape()` | `INVALID_AST` | Gemini returned parseable JSON, but it doesn't match the `CanonicalSchemaAST` shape (or declares an unsupported `astVersion`) |
| `analyzeSchema()` | `SEMANTIC_VALIDATION_FAILED` | The AST is shape-valid but semantically broken (dangling FK, duplicate table, etc. — `analysis.errors`, joined into one message) |
| `buildGeneratedArtifacts()` | `COMPILER_FAILED` | A *required* artifact compiler (SQL, Drizzle, or JSON) either isn't registered or returned `{ ok: false }` |
| `createGeneration()` | `GENERATED_NOT_SAVED` | Compilation succeeded but the database write failed — same meaning as before, now reached one stage later |
| (none of the above) | `SUCCESS` | `data: GeneratedSchema` + `generationId`, identical shape to the old pipeline's success case |

Deliberately *not* a hard failure: if the optional `docs.markdown` or
`diagram.mermaid` compiler fails or isn't registered, `documentation`/
`mermaidDiagram` are simply left off the returned `GeneratedSchema` —
matching those fields' existing optionality and the original AI prompt's
own "omit rather than guess" rule, just enforced by
`buildGeneratedArtifacts` instead of by the model.

`buildGeneratedArtifacts` is exported (not just used internally)
specifically so this mapping — arguably the highest-risk new logic,
since it's the seam between the generic `CompileAllResult[]` and the
concrete `GeneratedSchema` contract everything downstream depends on —
can be exercised directly against a real `compileAll()` output without
needing a live Gemini call or database connection.

### Preserving the existing API

Nothing outside `lib/services/generation.service.ts` changed:

- **`lib/actions/generate-schema.ts`** (the Server Action) still imports
  `generateAndPersistSchema` and `GenerateAndPersistResult` by the same
  names and calls the function with the same `{ prompt, projectId }`
  shape — it re-exports the (now wider) status union transparently and
  required zero edits.
- **`components/dashboard/schema-generator.tsx`** only ever branches on
  `outcome.status === "SUCCESS" || outcome.status === "GENERATED_NOT_SAVED"`
  (using `outcome.data`) vs. everything else (using `outcome.error`) — so
  the five new/renamed failure statuses all flow through the existing
  `else` branch correctly without any component changes. It doesn't yet
  discriminate between them individually; doing so is possible later
  without touching this service again, since the type distinction already
  exists.
- **`types/schema.ts` (`GeneratedSchema`/`generatedSchemaSchema`)** is
  completely unchanged — it was never AI-generation code, it's the
  persistence/API contract (`lib/db/schema.ts`'s `generations.artifacts`
  column is typed against it), and the whole point of
  `buildGeneratedArtifacts` is to keep producing exactly this shape.
- **`lib/repositories/*`, `lib/db/schema.ts`, `supabase/*`** — untouched;
  `createGeneration`/`getProjectById` are called exactly as before.

### Legacy removal

Deleted outright, not just superseded:

- `lib/ai/generate.ts` (`callGemini`) — replaced by the Gemini call
  inside `lib/ai/providers/gemini.ts`, now requesting a `CanonicalSchemaAST`
  instead of the old `{ sql, drizzle, json, documentation?, mermaidDiagram? }`
  contract.
- `lib/ai/parse-response.ts` (`parseGenerateSchemaResponse`, which
  validated the model's response against the old `generatedSchemaSchema`)
  — replaced by `parseAstResponse` inside `gemini.ts`, which only
  interprets the Gemini response *envelope* (block reason, finish
  reason, JSON-parseability) and deliberately leaves AST shape
  validation to `validateASTShape()`, so those stay distinct failure
  categories (`AI_ERROR` vs `INVALID_AST`) instead of being collapsed
  into one the way the old file's validation was.
- `lib/ai/prompts.ts` (`SYSTEM_PROMPT`, `buildMessages`, which instructed
  Gemini to produce SQL/Drizzle/JSON/docs/Mermaid directly) — replaced by
  `lib/ai/providers/gemini-prompts.ts` (`AST_SYSTEM_PROMPT`,
  `buildAstMessages`), which instructs Gemini to produce only a
  `CanonicalSchemaAST` and moved under `lib/ai/providers/` since prompt
  construction is a provider implementation detail (a future non-Gemini
  provider would build its own prompt in its own shape).

No compiler imports anything from `lib/ai/*`, and no AI-facing file
(`client.ts`, `providers/gemini.ts`, `providers/gemini-prompts.ts`)
imports anything from `lib/compiler/*` — the dependency only ever flows
`lib/ai/providers/gemini.ts → CanonicalSchemaAST ← lib/compiler`, never
compiler-to-AI. The deterministic compiler pipeline is now the only
runtime path from prompt to persisted artifacts.
