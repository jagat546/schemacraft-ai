# SchemaCraft AI Architecture

## Vision

## Tech Stack

## Folder Structure

## Decisions

## ADR-001 — Database Foundation

Status: Accepted

Database hierarchy:

auth.users
    ↓
profiles
    ↓
projects
    ↓
generations

Storage Strategy:
- GeneratedSchema persisted as JSONB
- GeneratedSchema remains the application contract
- No decomposition of artifacts into relational columns

Security:
- Row Level Security enabled
- Explicit SELECT / INSERT / UPDATE / DELETE policies
- Ownership enforced through auth.uid()

Constraints:
- UUID primary keys
- Cascade deletes
- Unique(project_id, version_number)

Implementation Notes:
- profiles.id → auth.users(id) foreign key maintained via SQL because of current Drizzle/Supabase migration limitations.

## ADR-002 — Runtime Data Access

**Status**

Accepted

### Decision

Runtime data access uses the authenticated Supabase Server Client.

Drizzle ORM is responsible only for:

- Schema definitions
- Relations
- Migrations
- Compile-time type safety

Repositories execute authenticated runtime queries through the Supabase Server Client so that Supabase Row Level Security (RLS) policies operate exactly as designed.

### Rationale

Supabase RLS depends on `auth.uid()`, which is populated from authenticated request context.

Raw postgres.js / Drizzle runtime connections do not automatically propagate authenticated user context.

Using the Supabase Server Client for runtime queries preserves native RLS behavior without custom JWT propagation or application-layer ownership filtering.

### Consequences

- Runtime repositories do not execute Drizzle queries.
- Drizzle remains the single source of truth for database schema.
- Runtime authorization is enforced by Supabase RLS.
- Repository methods will be implemented in Sprint 3 – Phase 5.

### ADR-003
Why Drizzle?

### ADR-004
Why Supabase?

...

## Database

## Authentication

## Future Roadmap