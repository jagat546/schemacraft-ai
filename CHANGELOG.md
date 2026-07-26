# Changelog

## v0.7.1 — Milestones 2b, 2c & 3: Generation Quality + History (2026-07-26)

### Added
- Foreign-key column indexing in generated SQL (`CREATE INDEX`) and Drizzle (`index()`) output, closing a standard Postgres performance gap present in every previously-generated schema
- Semantic-analyzer warning for many-to-many join tables missing a composite uniqueness guarantee on their FK pair (informational only — never blocks generation)
- Generation History UI (`/dashboard/projects/[id]/history`): browse every past generation for a project, open one into the existing Developer Workbench, delete one with confirmation — the first UI surface for the `getProjectGenerations`/`getGeneration`/`deleteGeneration` repository functions built during Sprint 4
- Live character counters on both prompt inputs (authenticated Generator and the public sandbox)

### Fixed
- Top-bar page title no longer falls back to the generic app name on per-project routes (Workbench, Project Settings, History)
- Signup no longer silently redirects to the login page with no explanation when email confirmation is required — the form now states this explicitly

### Changed
- Removed the unused `react-hook-form` dependency; relocated `shadcn` (a CLI-only scaffolding tool) from runtime `dependencies` to `devDependencies`

## v0.7.1 — Milestone 1: Test Infrastructure & CI (2026-07-23)

### Added
- Vitest test runner with 149 automated tests across 9 files: AST validator (21), semantic analyzer (24), all 5 compilers — SQL, Drizzle, JSON, Markdown, Mermaid (138 total), and generation-service integration tests (11)
- GitHub Actions CI (`.github/workflows/ci.yml`): lint → typecheck → test → build on every push/PR to `main`
- Full production end-to-end validation: all core generation flows, database persistence, duplicate-submission handling, and negative-input testing (empty/whitespace/oversized/emoji/injection-style prompts) verified live against production

### Changed
- Formal architecture review of the v0.7.1 roadmap before implementation began

## v0.7.0 — Canonical Schema AST & Compiler Pipeline (2026-07-22)

### Added
- Canonical Schema AST (`lib/ast/`) as the single AI output contract, replacing direct multi-artifact generation
- Two-phase validation: structural (Zod) shape validation, then semantic analysis (duplicate names, dangling foreign keys, unsafe expressions, and more)
- A deterministic compiler registry with 5 independent compilers (SQL, Drizzle, JSON, Markdown, Mermaid), each a pure function producing byte-identical output for the same input

### Fixed
- Production stability: migrated to the `gemini-flash-latest` model alias and removed an incompatible `thinkingConfig` parameter after diagnosing intermittent production failures

### Removed
- Legacy direct-generation code path (`lib/ai/generate.ts`, `parse-response.ts`, `prompts.ts`)

## v0.6.0 — Project & Generation Persistence (2026-07-22)

### Added
- Full project and generation persistence via Supabase-backed repositories

## v0.5.0 — Repository Layer (2026-07-21)

### Added
- Project and generation repositories with Row Level Security-scoped CRUD

## v0.4.1 (2026-07-21)

### Added
- Drizzle Kit package scripts (migrate, generate, push, studio)

## v0.4.0 — Authentication & Database Foundation (2026-07-21)

### Added
- Supabase Auth integration (sign up / log in / log out, session handling)
- Supabase and Drizzle ORM foundation
- Documentation and Mermaid diagram output viewers
- Sprint 1 developer-experience improvements

## v0.2.0 — Initial AI Generation (2026-07-18)

### Added
- Gemini AI integration
- Server Actions
- Structured schema generation
- SQL generation
- Drizzle ORM generation
- JSON sample data generation
- Prompt builder
- Response parser
- AI configuration module

### Changed
- Replaced mock generator with Gemini-backed generation
