# AD-004 — Session Expiration Handling for Interactive Workflows

**Status:** Proposed. No code changes accompany this record — decision only, per Sprint 4 task AD-004.
**Raised by:** S4-006 (Authentication Enhancements), blocked on this decision. See `Sprint-04-Implementation-Roadmap.md` §S4-006 and the S4-006 completion report for how this surfaced.
**Consumed by (future):** S4-012 (Generator staged reveal), the only concrete workflow named in the spec that needs this.

---

## Problem

`Navigation-Experience-Specification.md` §Session Expiration requires: when a session expires *during* an in-progress interactive action (its own example: submitting a prompt in the Generator), the UI should show a specific "Your session has expired" message with a sign-in-again action, and preserve whatever the user had in progress (an unsent prompt) — not yank them to `/login` and discard it.

Today's authentication primitive can't do this. `requireUser()` (`lib/auth/require-user.ts`) is a hard gate: no session, no return — it redirects to `/login` immediately, from inside the Server Action. There is no typed result a calling client component could inspect and render its own error state from instead; Next.js's Server Action redirect mechanism is specifically designed so the client-side caller never regains control to intercept it — the browser is navigated away before any awaiting code runs.

## Current Behavior

```ts
// lib/auth/require-user.ts
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }
  return user
}
```

- `getCurrentUser()` (`lib/auth/current-user.ts`) is the actual session check — it calls `supabase.auth.getUser()` and returns `User | null`. `requireUser()` is a thin wrapper adding the redirect.
- Verified via `grep`: exactly three files call `requireUser()` today — `lib/actions/generate-schema.ts`, `lib/actions/project.actions.ts`, `lib/actions/generation.actions.ts`. All three are page-level or CRUD Server Actions invoked from Server Components or simple form submissions, where an immediate redirect to `/login` on a missing session is exactly the right behavior (there's no in-progress client state worth preserving in any of these three today).
- `proxy.ts` → `updateSession` provides the same protection independently at the route level (defense in depth, per `SCHEMACRAFT_AI_MASTER_CONTEXT.md` §5) — `requireUser()` is a second, Server-Action-level gate, not the only one.

## Candidate Solutions

**A — Change `requireUser()` to return a typed result instead of redirecting, update all call sites.**
Single source of truth, but cascades into all three existing files above (and any future protected action), changing an established, working contract for a case none of them currently need. Highest blast radius of the options considered.

**B — Add a new, parallel, non-redirecting helper; leave `requireUser()` untouched.**
`requireUser()` keeps its exact current signature and behavior for every existing and future page-level caller. A new function — call it `getSessionResult()` — returns `{ status: "OK"; user: User } | { status: "SESSION_EXPIRED" }` and never redirects. Both helpers call the same underlying `getCurrentUser()`, so there is no duplicated *session-detection* logic, only a duplicated (and deliberately different) *what-to-do-about-it* decision. Zero existing files need to change.

**C — Give `requireUser()` an options parameter** (e.g. `requireUser({ redirectOnMissing: false })`) to toggle behavior per call site.
Avoids a second function name, but changes the signature of a function every existing protected action already depends on, and makes its contract conditional/harder to read at a glance ("which boolean means what") — a hot, widely-used primitive is exactly the wrong place to add a silent behavioral toggle if it can be avoided.

**D — Handle it entirely client-side, no server-side change.**
Not technically viable: Next.js intercepts a Server Action's internal `redirect()` via a special thrown "digest" the client runtime resolves into a navigation before calling code ever sees a normal return. There is no supported way for the caller to catch that and render its own UI instead. Rejected on technical grounds, not preference.

## Recommended Solution

**B.** It's the only option that satisfies both stated requirements with no tradeoff between them: existing protected Server Actions are provably unaffected (they never reference the new export), and a future interactive workflow gets exactly the typed result it needs. It also directly follows this task's own steer ("prefer introducing a new helper... if that produces lower risk") and this project's established pattern of discriminated-union results for multi-outcome operations (`generateAndPersistSchema`'s `SUCCESS`/`AI_ERROR`/`PROJECT_NOT_FOUND`/... shape in `lib/services/generation.service.ts` is the direct precedent — a `SESSION_EXPIRED` branch is a natural, consistent addition to that same style, not a new pattern).

As a low-risk internal cleanup *bundled with* this same change (not a separate decision): `requireUser()` can be reimplemented in terms of `getSessionResult()` (redirect on `SESSION_EXPIRED`, return `user` on `OK`) so there's exactly one place that calls `supabase.auth.getUser()` for this purpose. This is invisible to every caller — `requireUser()`'s exported signature and behavior don't change — and is recommended specifically because it removes the possibility of the two helpers' session-detection logic silently drifting apart later.

## Files That Would Eventually Change

*(Design only — nothing below is implemented by this ADR.)*

| File | Change | When |
|---|---|---|
| `lib/auth/session-result.ts` *(new)* | `getSessionResult()`: calls `getCurrentUser()`, returns the typed union, never redirects. | The dedicated follow-up task implementing this ADR (recommended: `S4-006B`, mirroring this sprint's `S4-004`→`S4-004B` pattern). |
| `lib/auth/require-user.ts` | Reimplemented on top of `getSessionResult()`; exported signature and behavior unchanged. | Same task, as a bundled low-risk cleanup. |
| `lib/auth/require-user.test.ts` *(new)* | Regression test: `requireUser()` still redirects on a missing session, still returns the user on success — guards the internal refactor above. | Same task. |
| `lib/actions/generate-schema.ts`, `lib/actions/project.actions.ts`, `lib/actions/generation.actions.ts` | **None.** Continue calling `requireUser()` exactly as today. | Never, under this decision. |
| A future Generator-facing Server Action (S4-012, not yet written) | Calls `getSessionResult()` instead of `requireUser()`; its own result type gains a `SESSION_EXPIRED` branch, following `generateAndPersistSchema`'s existing discriminated-union pattern. | S4-012, when the Generator's staged-reveal work actually builds this action. |
| That same future action's client-side caller (S4-012) | Renders the `SESSION_EXPIRED` branch via `ErrorState` (`components/patterns/error-state.tsx`, already built in S4-004) with a `sign-in-again` recovery action; preserves the in-progress prompt in `generation-store` since no navigation occurs. | S4-012. |

## Backwards Compatibility Analysis

`requireUser()`'s exported signature (`(): Promise<User>`) and observable behavior (redirect to `/login` on no session, otherwise return the user) are unchanged for every existing and future caller that doesn't explicitly opt into the new helper. All three current call sites need zero changes. This is additive, not a migration — nothing currently working is altered.

## Risks

- **Two auth-check entry points inviting the wrong choice.** Someone could reach for `getSessionResult()` in a plain page-level Server Component (and forget to redirect themselves on `SESSION_EXPIRED`) or reach for `requireUser()` in an interactive client-driven action (and lose the preserved-state benefit entirely). Mitigate with a clear doc comment on each: `requireUser()` = default choice for page-level/Server-Component data loading, hard redirect is correct there; `getSessionResult()` = only for client-driven interactive actions that need to render their own recovery UI without navigating.
- **Internal refactor of `requireUser()` is a small regression surface.** Mitigated by the dedicated regression test called for above, verifying its redirect behavior is byte-for-byte unchanged before/after.
- **Scope creep temptation.** Once `getSessionResult()` exists, there may be a temptation to retrofit the three existing protected actions "for consistency." Explicitly out of scope — none of them have an in-progress-client-state problem to solve, and touching them isn't needed to unblock S4-012.
- **The new helper sits unused until S4-012.** Acceptable — it's cheap, isolated, and easy to delete if the Generator's eventual design ends up not needing it after all (unlikely, since it's the spec's own named example, but noted for completeness).

## Migration Strategy

Not a migration — a purely additive change with no phased rollback needed beyond deleting the new file if ever abandoned, since nothing else depends on it until a future task opts in.

**Sequencing recommendation:** implement this ADR as its own small, dedicated task — `S4-006B` — before S4-012 needs it, the same way `S4-004B` closed out `S4-004`'s remaining scope this sprint. That keeps S4-012 from having to solve this from scratch under its own time pressure, and keeps this change independently reviewable rather than bundled into a larger Generator task.

---

**Outcome of this record:** Recommend proceeding with **Solution B** as `S4-006B`, sequenced any time before `S4-012` begins. `S4-007` remains unblocked by this decision — it does not depend on session-expiration handling — and can proceed once explicitly resumed.
