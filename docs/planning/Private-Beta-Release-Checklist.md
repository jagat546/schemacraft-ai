# Private Beta Release Readiness Audit

**Status:** Audit only. No application code, infrastructure, or other documentation was modified to produce this document.
**Scope:** SchemaCraft AI as it exists at Sprint 7 closure (`feature/sprint-6-application`, commit `4ea80b1`), assessed against "this is about to be deployed for a private beta with real users."
**Method:** Every item below was checked directly against the repository (source code, SQL, config files, scripts) — not assumed from prior planning documents. Items this environment cannot verify (live Supabase/Vercel dashboard settings, actual configured secrets, real-device/browser behavior) are marked ⚠ and explained, not guessed at.

---

## Executive Summary

The application code is in good shape — 362 passing tests, clean lint/typecheck/build, and a deliberate multi-sprint hardening effort (Retry, rate limiting, delete-account, touch targets, onboarding, loading/error states). But **code-complete is not the same as beta-ready**, and this audit found one issue severe enough to be a hard stop: **the SQL functions the rate-limiting and delete-account features depend on have never been applied to any live database.** Because the rate-limit check fails closed by design, this means **every authenticated generation request will fail** the moment beta traffic starts, until someone runs the already-prepared migration against the real Supabase project. This is not a code task — the code is correct and committed — it's an operational step that must happen before a single invite goes out.

Beyond that one hard blocker, most of what's needed before beta is **verification of live configuration** (environment variables, Supabase dashboard settings, Vercel deploy behavior) rather than new code — this repository has done the engineering work; what remains is largely making sure the deployed environment matches what the code assumes.

---

## Audit Checklist

Every area requested, checked directly against the repository:

| Area | Status | Notes |
|---|---|---|
| **Authentication** | ✅ Ready | Supabase Auth via `@supabase/ssr`; signup/login/logout, password reset, sign-out-all-sessions, session-expiration recovery (AD-004) all implemented and tested. No OAuth providers configured (email/password only) — one fewer callback-URL surface to misconfigure. |
| **Supabase (client wiring)** | ✅ Ready | Single anon-key client factory (`lib/supabase/{client,server,middleware}.ts`); no service-role client exists anywhere (by design, per AD-005's audit). |
| **Migrations (Drizzle)** | ⚠ Needs verification | `drizzle/migrations/` has 2 files (`0000_optimal_doctor_strange.sql`, `0001_high_blacklash.sql` — the latter is `sandbox_generations`). Neither `user_preferences` nor `generation_rate_limit_events` has a generated Drizzle migration — both are created via raw `CREATE TABLE IF NOT EXISTS` inside `supabase/rls.sql` instead (see next row). Confirm this is understood as the actual deployment mechanism, not an oversight, before anyone runs `drizzle-kit generate` and gets confused by a missing migration. |
| **RPC functions / RLS (`supabase/rls.sql`)** | ❌ **Blocking** | `check_authenticated_rate_limit()` and `delete_own_account()` are reviewed, committed, idempotent SQL — **not yet applied to any live database.** See Critical Blockers below. |
| **Server Actions** | ✅ Ready | Every mutation goes through a `"use server"` boundary; ownership checks via RLS, not application-layer filtering; all tested. |
| **AI providers** | ✅ Ready for beta scope | Gemini is the only provider that needs to work (only `GEMINI_API_KEY` is required per `.env.example`); Anthropic/OpenAI are implemented but optional and non-default. Lazy client construction (S5-003 fix) means missing `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` cannot crash a Gemini-only generation. |
| **Environment variables** | ⚠ Needs verification | `.env.example` documents 4 required (`DATABASE_URL`, 2 Supabase vars, `GEMINI_API_KEY`) + 4 optional. **`NEXT_PUBLIC_SITE_URL` is the one most likely to be silently wrong in production** — if unset, password-reset emails link to `http://localhost:3000` for real users. This repository cannot see what's actually configured in Vercel. |
| **Routing** | ✅ Ready | Route protection enforced twice (proxy + layout gate); S7-001 added loading/error/not-found for every route. |
| **Error handling** | ✅ Ready | `app/error.tsx` + `app/global-error.tsx` (S7-001) replace Next's default crash screen with this product's own `ErrorState`; every Server Action returns a typed result rather than throwing for expected failures. |
| **Loading states** | ✅ Ready | `app/(dashboard)/loading.tsx` (S7-001) covers every authenticated route; `OutputSkeleton` covers in-page generation loading. |
| **Mobile responsiveness** | ⚠ Needs verification | `useIsMobile()` (768px breakpoint) drives `SplitPaneCanvas`'s stacking; grids use `sm:grid-cols-2`; most page shells are single-column flex layouts with no fixed widths (naturally mobile-safe). **No live device or browser testing has been performed anywhere in this project's history that's disclosed in the repository** — this is an unverified assumption, not a confirmed defect. |
| **Accessibility** | ⚠ Needs verification | Touch targets fixed (S6-006/TD-020); structural/ARIA coverage via `jest-axe` (S4-016). **Color contrast has never been verified against the real compiled stylesheet** (jsdom-based tests can't do this) — a disclosed, standing gap, not new. |
| **Deployment assumptions** | ❌ **Blocking for safe iteration** (DevOps-owned) | CI is `workflow_dispatch`-only (no automatic push/PR verification); CD is non-functional (stale branch filter, targets EC2/PM2 which conflicts with Vercel as the confirmed platform) — TD-024/AD-006. `next.config.ts`'s `output: "standalone"` is a harmless EC2-era leftover. CI currently pins Node 22 while Vercel's confirmed production runtime is Node 24 — a latent inconsistency, low risk while CI doesn't gate anything anyway. |
| **Rate limiting** | ⚠ Code ready, deployment blocking | Sandbox (5/hour, IP-hash) and authenticated (60/hour, burst 10/minute, S6-004/S7-003 with retry-time messaging) are both correctly implemented and fail closed. The authenticated path's SQL function is the same one flagged ❌ above — code is ready, live deployment is not. |
| **Delete account** | ⚠ Code ready, deployment blocking | `delete_own_account()`, `deleteAccountAction`, and the high-friction confirmation UI are all implemented and tested (S6-003/AD-005). Same live-deployment gap as rate limiting — the function doesn't exist in production yet. |
| **Export** | ✅ Ready | Client-side "Export all" zip bundle (`fflate`, S4-013) has no server dependency beyond data already in memory — nothing to deploy or misconfigure. |
| **Workbench** | ✅ Ready | Monaco editor, split-pane, fullscreen mode, generation nav all shipped and tested; TD-021 (instant vs. animated fullscreen transition) and TD-023 (2 missing keyboard shortcuts) are known, low-severity, non-blocking gaps. |
| **History** | ✅ Ready | List/view/delete (undoable) plus Edit & Regenerate (S7-002, including the project-selection fix) all implemented and tested. |
| **Onboarding** | ✅ Ready | Dismissible first-run card (S6-007), cookie-backed, auto-dismisses on first real generation. |
| **Storage** | ✅ N/A | No Supabase Storage usage anywhere in the codebase (confirmed via grep during AD-005's own audit and re-confirmed here) — nothing to configure. |

---

## Critical Blockers

### 1. ❌ The rate-limiting and delete-account SQL functions are not applied to any live database

**What's true today:** `supabase/rls.sql` contains `check_authenticated_rate_limit()`, `generation_rate_limit_events`, and `delete_own_account()` — all reviewed, committed, and idempotent (`DROP ... IF EXISTS` / `CREATE TABLE IF EXISTS` throughout). None of them have been run against the real Supabase project. This environment has no live Supabase credentials, consistent with this project's standing disclosure across every sprint since Sprint 5.

**Why this is a hard stop, not a "nice to have":** `checkAuthenticatedGenerationRateLimit()` calls `supabase.rpc("check_authenticated_rate_limit", ...)`. If that function doesn't exist, the RPC call itself errors. `resolveRateLimitOutcome()` maps *any* RPC error to `UNAVAILABLE` — a deliberate fail-closed design so a broken rate limiter can never silently become a bypass. `generate-schema.ts` turns `UNAVAILABLE` into `RATE_LIMIT_UNAVAILABLE`, rejecting the request. **The practical result: every single authenticated generation request fails from the first beta user's first attempt**, not "rate limiting doesn't work" — the core product doesn't work at all.

Delete-account fails more gracefully (a caught RPC error just shows an error toast), but the feature is completely non-functional until the same migration lands.

**The fix is already written and is one command:** this repository has `npm run db:apply-sql` (runs `scripts/apply-supabase-sql.mjs`, which applies `supabase/triggers.sql` then `supabase/rls.sql` in order) and `npm run db:setup` (which also runs `drizzle-kit migrate` first for anything Drizzle-generated). Both are idempotent and safe to run against production even though earlier versions of `rls.sql` are presumably already live (the script drops-then-recreates every policy/function it touches). **This must run against the real `DATABASE_URL` before any beta invite goes out.** It is explicitly not a Sprint 8 (or any Sprint) code task — the code is done; this is a deployment action requiring credentials this environment doesn't have.

### 2. ❌ CI has no automatic trigger; CD is non-functional (DevOps-owned, restated from TD-024/AD-006)

Not new to this audit, but re-confirmed: `project_ci.yml` only runs on manual `workflow_dispatch`; `project_cd.yml` targets a stale branch filter and deploys to EC2/PM2, which conflicts with Vercel as the confirmed platform. This doesn't block the app from *running* in production, but it means **there is currently no automatic safety net for whatever ships next** — a real risk the moment a beta starts generating bug reports that need fast, verified fixes. DevOps-owned; out of this audit's authority to fix, restated because it matters for beta operations, not because anything changed.

---

## Recommended Deployment Order

1. **Apply the pending SQL** (`npm run db:apply-sql` or `npm run db:setup`) against the production `DATABASE_URL`, with a human reviewing the diff against what's presumably already live first — this is the one truly blocking action.
2. **Verify every environment variable Vercel actually has configured** against `.env.example`, with special attention to `NEXT_PUBLIC_SITE_URL` (must be the real production domain, not left unset) and `GEMINI_API_KEY` (must be valid and have quota headroom for 100 users' worth of traffic).
3. **Verify Supabase Auth's dashboard-level Site URL / Redirect URLs allowlist** includes the production domain — required for password-reset and signup-confirmation email links to resolve correctly; cannot be checked from this repository.
4. **Run the full manual smoke test** (below) against the actual deployed production URL, not `localhost`.
5. **Confirm the CD/CI situation is at least understood by whoever's on call during beta** — even if not fixed before launch, someone should know that "push to `main`" doesn't currently verify or deploy anything automatically.
6. **Invite users.**

---

## Manual Verification Checklist

Cannot be performed in this environment (no browser, no live credentials) — listed as explicit pre-launch actions for a human:

- [ ] Sign up with a real email; confirm the confirmation email arrives and its link resolves to the production domain, not `localhost`.
- [ ] Trigger a password reset; confirm the same.
- [ ] Generate a schema end-to-end with a real `GEMINI_API_KEY`; confirm all 5 artifacts render.
- [ ] Deliberately exceed the burst rate limit (11 requests in under a minute); confirm the rejection message shows a retry estimate, not a generic error.
- [ ] Delete a test account; confirm the account and its projects/generations are actually gone from Supabase afterward.
- [ ] Load the Dashboard/Generator/Workbench on a real phone (not just a resized desktop browser window) on both light and dark theme.
- [ ] Confirm `NEXT_PUBLIC_SITE_URL`, `GEMINI_API_KEY`, and both Supabase vars are set correctly in the Vercel dashboard for the Production environment specifically (not just Preview).

## Smoke Test Checklist

- [ ] Landing page loads (`/`), sandbox demo generates a schema without an account.
- [ ] Sign up → email confirmation → first login → lands on Dashboard.
- [ ] Onboarding card appears for a new user; dismisses permanently after the first successful generation.
- [ ] Create a project, generate a schema, all 5 tabs render in the Workbench.
- [ ] Edit & Regenerate from History carries the correct prompt *and* the correct project (S7-002's own regression case).
- [ ] Export all (zip download) produces a valid archive with all artifacts.
- [ ] Hit the authenticated rate limit; confirm a clear, actionable rejection.
- [ ] Delete account; confirm sign-out and inability to log back in with the same credentials.
- [ ] Force an error (e.g., temporarily break a Server Action) and confirm `app/error.tsx`'s recovery UI appears, not a raw stack trace.
- [ ] Visit a nonexistent route; confirm the branded 404, not Next's default.

## Production Checklist

- [ ] `npm run db:apply-sql` executed against production `DATABASE_URL`.
- [ ] All required env vars present in Vercel's **Production** environment (not just Preview/Development).
- [ ] Supabase Auth Site URL / Redirect URLs allowlist includes the production domain.
- [ ] `GEMINI_API_KEY` has sufficient quota for expected beta volume (60/user/hour × up to 100 users is a real number to plan capacity against).
- [ ] A rollback plan exists if the SQL application step needs to be reversed (none of the new functions are destructive to existing data, but confirm before running).
- [ ] Whoever is on call during beta knows CI/CD does not auto-verify or auto-deploy today.

## Mobile Checklist

- [ ] Dashboard, Generator, Workbench, History, Settings each manually checked on a real phone (not just devtools device emulation) in both orientations.
- [ ] Onboarding card and its actions are usable at narrow widths.
- [ ] Touch targets (fixed in S6-006 for icon-only buttons) actually feel adequate on a real touchscreen, not just verified via computed CSS.
- [ ] Workbench's split-pane correctly stacks vertically on mobile rather than squeezing two panes side by side.

## Security Checklist

- [ ] RLS is confirmed as the sole authorization layer in production (no service-role client exists in code to accidentally bypass it).
- [ ] `delete_own_account()`'s `auth.uid()` scoping (never a caller-supplied ID) is the one property to double-check most carefully once live — this is the entire security boundary between "delete your own account" and "delete anyone's."
- [ ] No secrets are committed anywhere in the repository (spot-checked: `.env.example` contains only variable names, no values).
- [ ] CSP is not configured (TD-012, known, non-blocking for a beta but worth being aware of).

## Performance Checklist

- [ ] No pagination exists on projects/generations lists — a non-issue at beta scale (100 users, modest project counts each) but worth a mental note if any single user accumulates unusually many generations.
- [ ] `gemini-flash-latest` is a Google-maintained alias (TD-014, accepted risk) — behavior could shift without this project's control; not something to fix before beta, just something to be aware could change mid-beta.
- [ ] No CDN/caching strategy beyond Vercel's own defaults has been specifically configured or verified — not flagged as blocking, since nothing in the repository suggests it's been a problem.

## Accessibility Checklist

- [ ] Touch targets: done (S6-006).
- [ ] Structural/ARIA: covered by automated `jest-axe` tests.
- [ ] Color contrast: **never verified against the real compiled stylesheet** — recommend a real, if brief, browser-based contrast check before beta, since this is the one accessibility dimension the automated suite structurally cannot cover.
- [ ] Keyboard navigation: core flows (forms, dialogs, command palette) are keyboard-operable per existing tests; the two missing Workbench shortcuts (TD-023) are a known, low-severity gap.

---

## Risk Assessment

1. **Highest risk, by a wide margin:** launching without applying the pending SQL — this isn't a degraded experience, it's a fully broken core product for every user.
2. **Second-highest:** a misconfigured or missing `NEXT_PUBLIC_SITE_URL`/Supabase redirect allowlist silently breaking password reset and email confirmation for real users, who won't have a workaround (unlike an internal tester who might know to check spam or guess the intended URL).
3. **Operational risk during beta:** no automatic CI/CD means any fix during the beta window depends on someone remembering to run validation and deploy manually, correctly, every time.
4. **Lower, disclosed-but-not-fixed risks:** unverified mobile experience, unverified color contrast, TD-021/TD-023 Workbench polish gaps — none of these are "will the product work" risks, all are "will it feel fully polished" risks, appropriately lower priority than the above.

## Definition of Ready for Private Beta

Beta is ready to launch when, and only when:

1. `npm run db:apply-sql` (or `db:setup`) has been run against the production database, and a real authenticated generation has been verified end-to-end against production (not localhost).
2. Every environment variable in `.env.example` is confirmed correctly set in Vercel's Production environment, with particular attention to `NEXT_PUBLIC_SITE_URL`.
3. Supabase Auth's dashboard Site URL / Redirect URLs allowlist includes the production domain, and a real password-reset email has been sent and its link confirmed to resolve correctly.
4. The Smoke Test Checklist above has been run once, manually, against the real deployed environment.
5. Whoever is on call during the beta window is aware that CI/CD does not currently auto-verify or auto-deploy.

Everything else in this document (mobile polish, contrast verification, the two remaining Workbench keyboard shortcuts, CSP) is real but does not block Definition of Ready — they're recommended follow-ups, not gates.
