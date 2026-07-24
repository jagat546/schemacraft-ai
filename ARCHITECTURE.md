# SchemaCraft AI Architecture

## Vision

SchemaCraft AI turns a natural-language description of a data model into a
complete, internally-consistent set of database artifacts. The core design
principle: the AI model never generates SQL, a Drizzle model, sample JSON,
documentation, or a diagram directly. It generates exactly one thing — a
**Canonical Schema AST** — and everything else is produced from that AST by
deterministic, independently-testable compilers. This guarantees every
artifact agrees with every other, because they're all compiled from the same
source of truth in the same run.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React Server Components) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| AI provider | Google Gemini (`@google/genai`), model `gemini-flash-latest` |
| Database | Supabase (PostgreSQL + Row Level Security) |
| ORM (local tooling only) | Drizzle ORM / Drizzle Kit |
| Diagrams | Mermaid |
| Testing | Vitest |
| CI | GitHub Actions |
| Hosting | Vercel |

## Folder Structure

```
app/
  (auth)/login, (auth)/signup      — auth routes
  dashboard/                       — main application
  page.tsx, layout.tsx, globals.css — root shell

components/
  auth/                            — login/signup forms (not a feature module — public-route auth UI)
  dashboard/dashboard-shell.tsx    — page-level composition of ProjectsPanel + SchemaGenerator
  providers/                       — theme + toast providers
  ui/                              — shadcn/ui primitives

features/                          — feature modules; see
                                      docs/architecture/frontend-modularization.md for the full
                                      module-ownership contract and day-by-day history
  shell/components/                — AppSidebar, TopNav, ThemeToggle
  ai-workspace/
    components/                   — PromptEditor, SchemaGenerator
    hooks/use-generate-schema.ts  — generateSchema Server Action orchestration
  compiler/components/            — GenerationStatus (idle / generating / error)
  workbench/
    components/                   — OutputTabs, CodeViewer, MarkdownViewer, MermaidViewer,
                                      OutputActions, OutputSkeleton
    lib/output-config.ts          — per-artifact label/filename/mimeType/language config
  projects/
    components/                   — ProjectsPanel, ProjectCard, CreateProjectDialog
    hooks/use-create-project.ts   — createProjectAction Server Action orchestration

lib/
  actions/                         — Server Action boundary ("use server")
  services/generation.service.ts   — pipeline orchestrator
  ai/
    client.ts                      — shared GoogleGenAI instance
    providers/                     — AIProviderAdapter contract + Gemini implementation
  ast/                             — AST schema, types, validator, semantic analyzer
  compiler/                        — 5 compilers + shared helpers + registry
  repositories/                    — RLS-backed Supabase data access
  stores/                          — ui-store, generation-store, project-store (Zustand;
                                      client-side state, never call Server Actions directly)
  supabase/                        — browser / server / middleware clients
  auth/                            — auth helpers
  db/                              — Drizzle schema definitions (local tooling only)
  download.ts, utils.ts            — shared generic client helpers (not feature-owned)

hooks/
  use-copy-to-clipboard.ts, use-mobile.ts — shared generic hooks (not feature-owned)

types/
  schema.ts                        — GeneratedSchema, the persistence/API contract
  ui.ts                            — UI-only types (shared across features and lib/stores)

supabase/
  rls.sql, triggers.sql            — Row Level Security policies, signup trigger

proxy.ts                           — Next.js 16 root proxy (auth route protection)
drizzle.config.ts                  — Drizzle Kit config (local migrations only)
test/, **/*.test.ts                — Vitest test suites
.github/workflows/ci.yml           — GitHub Actions CI
docs/architecture/sprint5-ast.md   — detailed AST/compiler pipeline design doc
docs/architecture/frontend-modularization.md — feature-module boundaries and day-by-day history
```

## The AI Pipeline

```
Prompt (UI)
   │
   ▼
Server Action (lib/actions/generate-schema.ts)
   │  auth check, zod validation (prompt 1–4000 chars, project ownership)
   ▼
Gemini Provider (lib/ai/providers/gemini.ts)
   │  genAI.models.generateContent() constrained by responseJsonSchema
   │  to the Canonical Schema AST shape — the model can only return an AST
   ▼
Canonical Schema AST (unvalidated JSON at this point)
   ▼
Shape Validation (lib/ast/validator.ts)
   │  Zod structural check + astVersion support check
   ▼
Semantic Analysis (lib/ast/analyzer.ts)
   │  pure, deterministic, never throws — duplicate names, dangling FKs,
   │  unsafe expressions (errors); missing PK, reserved keywords,
   │  circular FKs (warnings)
   ▼
Compiler Registry (lib/compiler) — compileAll(ast)
   ├──▶ SQL         (lib/compiler/sql)
   ├──▶ Drizzle     (lib/compiler/drizzle)
   ├──▶ JSON        (lib/compiler/json)
   ├──▶ Markdown    (lib/compiler/markdown)
   └──▶ Mermaid     (lib/compiler/mermaid)
   ▼
buildGeneratedArtifacts() — maps compiler output to GeneratedSchema
   ▼
Persistence (lib/repositories/generation.repository.ts) — Supabase insert
   ▼
UI renders all 5 tabs (SQL / Drizzle / JSON / Documentation / Mermaid)
```

## The Canonical Schema AST

Defined once as a Zod schema (`lib/ast/schema.ts`), with TypeScript types
derived via `z.infer` (`lib/ast/types.ts`) — no hand-written duplicate
interface that could drift from it. The AST is intentionally
database-agnostic: tables, columns, relationships, indexes, constraints,
defaults, nullability, and primary keys, with no concept of "Postgres" or
"Drizzle" baked in. `CanonicalSchemaAST.astVersion` versions the shape of
the AST itself, independent of the app's own release version.

## Compiler Registry

`CompilerRegistry` (`lib/compiler/registry.ts`) is a register/get/list map
from `CompilerId` to `SchemaCompiler` instance. `createCompilerRegistry()`
(`lib/compiler/index.ts`) is a factory that returns a fresh registry with
all five compilers pre-registered — importing `lib/compiler` has no side
effects; a registry is only created when a generation actually runs.
`compileAll(ast)` runs every compiler against the same AST; one compiler's
failure (`{ ok: false }`) never blocks the others, since failure is
represented in the result, not thrown.

Every compiler shares the same guarantee: a pure function, no network
calls, no filesystem access, no mutation of the input AST, and no
non-deterministic input (`Math.random`, `Date.now`, crypto) — the same AST
always produces byte-identical output.

### SQL Compiler (`lib/compiler/sql`)

The reference implementation. Produces `CREATE TABLE` statements (with
resolved primary keys and table-level constraints), `CREATE [UNIQUE]
INDEX` statements, and foreign keys as `ALTER TABLE ... ADD CONSTRAINT`
statements emitted after every table (so declaration order never matters).
Every identifier is double-quoted; `enum` columns compile to `TEXT` + a
`CHECK` constraint rather than a native Postgres `ENUM` type.

### Drizzle Compiler (`lib/compiler/drizzle`)

Targets `drizzle-orm` 0.45.x and matches this project's own schema
conventions: snake_case column names, camelCase properties, the 3-argument
`pgTable` form when a table needs indexes/composite keys/table-level
constraints. Single-column relationships get a physical
`.references(() => ...)` plus a `relations()` entry; composite
relationships get a `relations()` entry only (a deliberate scope cut to
avoid needing topological table ordering).

### JSON Compiler (`lib/compiler/json`)

Produces 3 deterministic sample rows per table in two passes: base values
first (type-shaped placeholders, ignoring relationships), then a second
pass overwrites foreign-key columns with real values from the referenced
table's rows — so relational correctness holds regardless of table
declaration order.

### Markdown Compiler (`lib/compiler/markdown`)

Produces a `# Schema Documentation` overview, a table of contents, one
`##` section per table (columns, indexes, constraints), and a global
`## Relationships` section.

### Mermaid Compiler (`lib/compiler/mermaid`)

Produces a single `erDiagram` block, rendered client-side in the browser.
Infers PK/FK/UK tags (one per column, PK beats FK beats UK) and
relationship cardinality (one-to-one only when every source column is
individually unique, one-to-many otherwise).

## Database (Supabase)

```
auth.users
    ↓
profiles
    ↓
projects
    ↓
generations
```

- `GeneratedSchema` (all 5 artifacts) is persisted as a single `JSONB`
  column — the application contract, not decomposed into relational
  columns.
- **Row Level Security is the sole authorization mechanism.** Every table
  has explicit SELECT/INSERT/UPDATE/DELETE policies; ownership is enforced
  through `auth.uid()`, with no application-layer ownership filtering.
- Runtime data access goes through the authenticated **Supabase Server
  Client**, not raw Drizzle queries — this is required for RLS policies to
  see the authenticated user's `auth.uid()`. Drizzle ORM is used only for
  schema definitions, relations, and local migrations; it has no runtime
  request-path role.

## Authentication

Supabase Auth via `@supabase/ssr`. Session-cookie handling is split across
`lib/supabase/{client,server,middleware}.ts`; route protection runs through
the Next.js 16 root proxy file (`proxy.ts`).

## Testing Architecture

165 automated tests across 12 files, run with **Vitest** (counts verified
directly against a real test run, not carried forward from an earlier,
since-inaccurate count — see below):

- `test/smoke.test.ts` (2) — proves the Vitest harness itself resolves the `@/*` alias and the `react-server` condition
- `lib/ast/validator.test.ts` (21) — shape validation, malformed input, version checks
- `lib/ast/analyzer.test.ts` (24) — one test per error/warning code, plus regression cases
- `lib/compiler/{sql,drizzle,json,markdown,mermaid}/*.test.ts` (91) — happy path, determinism, and a regression test per compiler
- `lib/services/generation.service.test.ts` (11) — integration tests for `buildGeneratedArtifacts`, the seam between compiler output and the persistence contract
- `lib/stores/{ui,generation,project}-store.test.ts` (16) — pure state-transition tests for the three client stores backing the feature modules (`ui-store` 3, `generation-store` 6, `project-store` 7)

Compiler tests use hand-written expected-output assertions, not snapshots
— since every compiler's entire design promise is deterministic,
human-reviewable output, a snapshot test would just rubber-stamp whatever
the compiler currently emits, including an unintended change.

## GitHub Actions CI

`.github/workflows/ci.yml` runs on every push and pull request to `main`:
checkout → Node 24 setup (with npm cache) → `npm ci` → lint → typecheck →
test → build. All four checks must pass; there is no deploy step, no test
matrix, and no coverage upload — deliberately minimal.

## Future Roadmap

See [`docs/planning/v0.7.1-roadmap.md`](./docs/planning/v0.7.1-roadmap.md)
for the full milestone-by-milestone technical roadmap beyond Milestone 1.

## Frontend Modularization

`components/dashboard` and `components/layout` have been reorganized into
five feature modules (`features/shell`, `features/ai-workspace`,
`features/compiler`, `features/workbench`, `features/projects`) backed by
three Zustand stores (`lib/stores/*`) — a structural refactor, with one
in-scope bug fix per module where a tracked `TECH_DEBT.md` item overlapped
the files being moved (TD-002, TD-016). No design or backend changes. See
[`docs/architecture/frontend-modularization.md`](./docs/architecture/frontend-modularization.md)
for the full module-ownership contract and day-by-day history.
