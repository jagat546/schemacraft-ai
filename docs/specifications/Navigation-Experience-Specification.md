# Navigation Experience Specification

**Status:** Sprint 3 deliverable. Specification only — no implementation.

**Governing documents:** `Design-System-2.0.md`.

**Scope note:** this document also covers the **Authentication Experience** deliverable from the Sprint 3 brief. Authentication is specified here, not as a standalone file, because sign-in/sign-up/session-expiration are fundamentally navigation and routing concerns — where a user is allowed to go, and where they're redirected when they aren't. §Authentication Experience below covers it in full. This decision is recorded in `Sprint-03-Summary.md`.

**Current baseline this extends:** a two-item sidebar (Dashboard, Generator) plus project-scoped icon links (Workbench, History, Settings) on each `ProjectCard`; a top bar with route title, command palette, theme toggle, sign-out; a `Cmd/Ctrl+K` command palette duplicating sidebar destinations plus theme/account commands; session handling via `proxy.ts` (`updateSession`, Supabase), which redirects unauthenticated requests to `/login`; auth pages at `/login` and `/signup`, both already handling the "email confirmation required" success state correctly (no session-less redirect, per `TECH_DEBT.md` TD-019).

---

## Global Navigation

- **Structure:** the three-tier model from `Dashboard-Experience-Specification.md` §Navigation Hierarchy — Global (sidebar), Project-scoped (card icon links), In-page (tabs/accordions). Every screen in the product is reachable from the sidebar or the command palette within two clicks; nothing is buried deeper.
- **Single source of truth:** exactly one nav-items registry (the existing `nav-items.ts` pattern) drives the sidebar, the command palette's navigation group, and route-title resolution — never a second hardcoded list, which is how the "sidebar renders the wrong icon" and "top bar falls back to the app name on unlisted routes" class of bugs happened historically (`TECH_DEBT.md` TD-018).

## Sidebar

Covered in depth in `Dashboard-Experience-Specification.md` §Sidebar Behavior. Restated here for navigation completeness: collapsible icon-mode, distinct icon per destination (closing the known duplicate-icon gap), `--accent-violet` active-state indicator, entries are Dashboard, Generator, and Account Settings.

## Breadcrumbs

- **Purpose:** orient a user on a project-scoped screen (Workbench, History, Project Settings) that sits below the sidebar's two-tier depth.
- **Behavior:** a single breadcrumb trail — `Dashboard / [Project Name] / [Screen]` (e.g., `Dashboard / Blog Schema / Workbench`) — rendered in the top bar region, replacing the plain route title on project-scoped routes (the route title alone, today, doesn't tell the user *which* project they're in). Each non-final segment is a real link: `Dashboard` returns to the project grid, `[Project Name]` returns to that project's default view (Workbench, most-recently-viewed generation). Per Design System 2.0 §10, wrapped in `<nav aria-label="Breadcrumb">`, non-final segments `--text-muted`, final segment `--text-primary`.
- **When absent:** global-tier screens (Dashboard, Generator, Account Settings) use the plain route title, not a breadcrumb — a breadcrumb with a single segment is noise, not orientation.

## Quick Actions

Covered in `Dashboard-Experience-Specification.md` §Quick Actions (New Project, New Generation, Resume last generation). Restated here only for completeness of the navigation surface: quick actions are a *shortcut into* the tiered navigation above, not a fourth tier — each one resolves to a normal route.

## Back Navigation

- **Rule:** every screen reachable by drilling in (Workbench, History, Project Settings, Account Settings categories) has one unambiguous way back — the breadcrumb's parent segment, or, on Account Settings, a persistent "Back to Dashboard" affordance in the header. The browser back button is never the *only* way back; relying on it exclusively fails whenever a screen was reached via a direct link (e.g., a shared Workbench URL with `?generation=<id>`).
- **Behavior after a destructive action:** deleting a generation (History) or a project keeps the user on the same screen with the item removed from the list, rather than force-navigating them elsewhere — an unexpected navigation immediately after a destructive click is disorienting on top of the action itself.

## Keyboard Navigation

- Every interactive element in the navigation chrome (sidebar items, breadcrumb links, top-bar controls, command palette) is reachable via `Tab` in visual order, with a visible focus ring (`--ring` token) at every stop, per Design System 2.0 §11.
- `Cmd/Ctrl+K` opens the command palette from anywhere, including while focused inside a text input (`allowInInput: true`, existing behavior) — the palette is the keyboard-first backbone of the entire navigation system, not a bonus feature.
- Sidebar items are reachable and activatable via arrow keys + Enter when the sidebar itself has focus, matching standard listbox/menu keyboard conventions.

## Search Navigation

- The command palette's search field is the product-wide navigation search — typing filters Navigation, Theme, Account commands (existing) and, per `Dashboard-Experience-Specification.md` §Search, project names. Selecting a project result from the palette navigates directly to that project's Workbench (its most useful default), not the Dashboard grid.
- This is distinct from Dashboard's own inline project search (`Dashboard-Experience-Specification.md`): the palette is for "get me there from anywhere," the inline search is for "narrow what I'm currently looking at" while already on the Dashboard.

## Mobile Navigation

- Sidebar collapses to icon-only below `lg` (existing) and to a fully-hidden, toggle-revealed drawer below `md` (new — icon-only still consumes meaningful width on small phones). The toggle lives in the top bar as a hamburger-equivalent icon button.
- Breadcrumbs on mobile collapse to a single "← [Parent]" back link rather than the full trail, since horizontal space for a multi-segment trail doesn't exist below `sm`.
- The command palette remains fully available on mobile (triggered by tapping the top-bar search icon, since `Cmd/Ctrl+K` has no mobile keyboard equivalent) — it is, if anything, more valuable on mobile, where drilling through a collapsed sidebar is slower than search.

---

## Authentication Experience

### Sign In

- **Purpose:** the single gate between a returning visitor and the product.
- **Behavior:** unchanged in structure from today's `LoginForm` — email + password, a primary-weight submit button, a link to Sign Up for users without an account. Layout: centered `Card` at `content-sm` width (existing pattern), elevation level 2.
- **Loading:** submit button enters its loading state (Design System 2.0 §10 Buttons) immediately on submit; the form fields become read-only (not disabled — a subtle but real distinction: disabled fields can look broken, read-only fields clearly show the value being submitted) for the duration of the request.
- **Success:** redirect to `/dashboard` (or, if the user arrived at `/login` via a redirect from a protected route, back to the route they originally requested — see Protected Routes below).

### Sign Up

- **Behavior:** unchanged in structure from today's `SignupForm`. **Success messaging is already correct and is retained as the standard pattern:** `signUp()` checks whether a session was actually established before redirecting; when the Supabase project requires email confirmation (as it does today), no session exists yet, so the form shows "Account created — check your email to confirm it before signing in." instead of redirecting into a still-unauthenticated `/dashboard` request (the exact bug closed in `TECH_DEBT.md` TD-019). Any future auth flow change must preserve this session-check-before-redirect pattern.

### Password Reset **(new)**

No password reset flow exists today — this is new scope for the rebuild.

- **Entry point:** a "Forgot password?" link on the Sign In form, beside the password field.
- **Step 1 — Request:** a single-field form (email), `content-sm`, submits to a reset-request action. Regardless of whether the email matches an account, the response message is identical ("If an account exists for that email, we've sent a reset link.") — this is a deliberate security choice (not revealing account existence via response differences), not an oversight, and should be called out as such in any implementation review.
- **Step 2 — Reset:** the emailed link lands on a dedicated route with a new-password + confirm-password form. On success, the user is signed in and redirected to `/dashboard` with a success toast ("Password updated.") rather than being sent back to Sign In to log in again with the new password — one fewer avoidable step.
- **Errors:** an expired/invalid reset link shows a clear explanation and a link back to Step 1 to request a new one, never a generic error page.

### Loading

- Every auth form (sign in, sign up, reset request, reset confirm) follows the identical loading pattern described under Sign In — button loading state, read-only fields, no full-page spinner/overlay for what is a sub-second, single-field-set submission.

### Error Handling

- Field-level validation errors (invalid email format, password too short) appear inline, beneath the specific field, at submit time or on blur — never only as a toast disconnected from the field that caused it.
- Server-rejected credentials ("Invalid email or password") render as a single message above the form fields, deliberately non-specific about *which* field was wrong — a security-standard pattern (not confirming whether the email exists), consistent with the Password Reset messaging choice above.
- Full detail in `Error-Experience.md` §Authentication Failures.

### Empty States

- Not generally applicable to auth forms (a form is never "empty" in the empty-state sense), with one exception: the Password Reset Step 2 route, visited with no token or an already-consumed token, renders the "invalid/expired link" state described above — treated as this flow's empty/invalid state.

### Success Messages

- Sign in: no explicit message needed — the successful redirect to the destination *is* the confirmation.
- Sign up (confirmation required): "Account created — check your email to confirm it before signing in." (existing, retained).
- Password reset: "Password updated." toast after Step 2, plus the request-step's neutral "If an account exists…" message (both already specified above).

### Session Expiration

- **Purpose:** never let a user act against a UI that silently no longer has a valid session.
- **Behavior:** when `proxy.ts`'s session refresh detects an expired/invalid session on a navigation, the user is redirected to `/login` exactly as an unauthenticated visitor would be (existing protected-route pattern, extended). For an in-progress action within an already-loaded page (e.g., a Server Action call fails with an auth error mid-session), the UI surfaces a specific "Your session has expired — sign in to continue" message (not a generic error) with a direct link to `/login` that, on success, returns the user to where they were — never a silent failure that looks like the action itself was broken.
- **Data protection:** if the expired action was a generation submission, the prompt text is preserved (matching `Generator-Experience-Specification.md`'s "never clear a prompt on failure" rule) so re-authenticating doesn't cost the user their input.

### Protected Routes

- Every route under `/dashboard/*` is protected via the existing `proxy.ts` → `updateSession` mechanism. An unauthenticated request to any protected route redirects to `/login`; the original destination is preserved (e.g., as a `?next=` param) so a successful sign-in returns the user directly to what they originally tried to reach, rather than dropping them at the generic Dashboard.
- The public marketing page (`/`) and its embedded sandbox remain intentionally unauthenticated (existing, retained) — protection applies to the authenticated app surface, not the product's front door.
