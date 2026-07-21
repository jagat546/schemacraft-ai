import "server-only"

// TODO (Sprint 3 – Phase 5): generation persistence repository.
// Runtime queries go through the authenticated Supabase Server Client
// (lib/supabase/server.ts), not Drizzle. See lib/repositories/README.md.
//
// Planned methods:
// - saveGeneration(input: { projectId: string; prompt: string; artifacts: GeneratedSchema })
// - getProjectHistory(projectId: string)
// - getLatestGeneration(projectId: string)

export {}
