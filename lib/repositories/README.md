# Repositories

Repositories are the runtime persistence layer for SchemaCraft AI.

- Runtime queries use the authenticated Supabase Server Client (`lib/supabase/server.ts`), so Supabase Row Level Security policies apply exactly as designed.
- Runtime repositories do NOT use Drizzle.
- Drizzle (`lib/db/`) remains responsible for schema, relations, migrations, and compile-time types only.

See `ARCHITECTURE.md` (ADR-002) for the full rationale. Implemented in Sprint 3 – Phase 5.
