# Error Experience

**Status:** Sprint 3 deliverable. Specification only.

**Governing documents:** `Design-System-2.0.md` §2 (`--accent-rose` semantic meaning), §10 (Error states component standard). Cross-references: `Micro-Interactions.md` §Interaction States (Error, visual/motion mechanics), `Empty-States.md` §Server Unavailable / §Rate Limit Exceeded (specific empty-state framings of infrastructure and limit errors), `Generator-Experience-Specification.md` §Failure Recovery (the generation-specific instance of these rules), `Navigation-Experience-Specification.md` §Authentication Experience (the auth-specific instance).

**Founding principle, from the sprint brief:** "AI should never surprise users negatively" and "Errors should explain recovery." Every error surface in the product is built from three parts, always: **what happened**, **why it isn't the user's fault when it isn't**, and **what to do next**. An error missing any of the three is incomplete, regardless of how it looks.

---

## Validation Errors

- **Definition:** the user's input itself is the problem — a prompt over the character cap, a malformed email on a form, a required field left blank.
- **Presentation:** inline, at the specific field responsible — beneath a form field, or as the character counter shifting to `--accent-amber`/`--accent-rose` (`Generator-Experience-Specification.md` §Prompt Editor). Never a toast for something the user can see and fix right where they are.
- **Timing:** shown at blur or submit, never on every keystroke (which would read as the UI scolding the user mid-thought) — the one exception is a live character counter, which is a running count, not a validation judgment, until it crosses the threshold.
- **Recovery:** implicit — the user edits the field and the error clears the moment the input becomes valid, with no separate "re-validate" step.
- **Example copy:** "Prompt must be under 4,000 characters (currently 4,180)." — states the limit and the actual value, not just "Too long."

## API Failures

- **Definition:** a Server Action or backend call completes but returns an error response (e.g., a Supabase constraint violation, a Gemini API error, a rejected generation).
- **Presentation:** contextual to where the call was made — a failed generation shows its error inside `GenerationStatus`/`OutputTabs` (per `Generator-Experience-Specification.md`), a failed project creation shows its error inside `CreateProjectDialog`, never as a disconnected global toast for an action the user is still looking at the source of.
- **Known vs. unknown failures:** where the failure has a specific, user-legible cause (e.g., the version-allocation race documented in `TECH_DEBT.md` TD-001, surfaced today as "This project was updated concurrently. Please try again.") that specific message is shown. Where the cause is opaque, the message falls back to the Unexpected Errors pattern below — never a raw error code or stack trace in the user-facing UI.
- **Recovery:** a Retry action that resubmits the same operation with the same input, always — matching the "never make the user redo work" rule established in `Generator-Experience-Specification.md`.

## Timeouts

- **Definition:** a request (most often a generation, given it's the product's longest-running operation) exceeds a reasonable wait without completing.
- **Presentation:** after a defined threshold (long enough to not misfire on a normal generation, short enough that the user isn't left staring at an indefinite skeleton), the loading state transitions to a specific timeout message: "This is taking longer than expected." — distinct from a hard failure, since the operation may still complete.
- **Recovery:** offers both "Keep waiting" (dismisses the message, lets the operation continue) and "Cancel and retry" — the user chooses, rather than the system unilaterally giving up on their behalf or leaving them stuck with no options.
- **Rule:** a timeout message is never presented as a failure (no `--accent-rose`) — it's an amber-toned, informational state (`--accent-amber`) until or unless it actually fails, at which point it becomes a real API Failure per above.

## Authentication Failures

- **Definition:** covers both failed sign-in attempts and mid-session auth failures (expired session, revoked token).
- **Presentation:** failed sign-in — a single, deliberately non-specific message above the form ("Invalid email or password"), per `Navigation-Experience-Specification.md` §Error Handling, so as not to confirm account existence. Session expiration mid-use — a specific, distinct message ("Your session has expired — sign in to continue") since at that point the user has already proven account ownership once this session; there's no remaining security reason to be vague.
- **Recovery:** sign-in failure — the form remains filled (except the password field, cleared for security) so the user only has to fix what was wrong, not retype the email. Session expiration — a direct link to `/login` that returns the user to exactly where they were on success (`Navigation-Experience-Specification.md` §Session Expiration), with any in-progress input (e.g., an unsent prompt) preserved.

## Unexpected Errors

- **Definition:** anything that doesn't map to a known, specific cause — an unhandled exception, a malformed response, a genuinely unforeseen failure mode.
- **Presentation:** "Something unexpected happened. Please try again, or contact support if this keeps happening." Paired with the standard error visual (`--accent-rose`, icon) per `Micro-Interactions.md`. This is the deliberate, honest fallback — the product never fabricates a specific-sounding explanation for a failure it doesn't actually understand, which would be worse than an honest generic message (a confident wrong explanation erodes trust faster than an honest "we're not sure").
- **Recovery:** Retry, plus (see §Escalation) a path to report the issue if retry doesn't resolve it.

## Network Failures

- **Definition:** the client can't reach the backend at all — covered primarily by `Empty-States.md` §Offline for the ambient/persistent case; this section covers a network failure that interrupts a specific in-progress action rather than a general connectivity loss.
- **Presentation:** inline at the point of the failed action ("Couldn't reach the server. Check your connection and try again.") — distinct wording from a generic API failure, since the actionable fix (check connectivity) is different and worth stating.
- **Recovery:** Retry; if the offline banner (`Empty-States.md`) is also active, the two states are consistent with each other rather than showing contradictory messages simultaneously — the inline action-specific message and the ambient offline banner should never disagree about what's wrong.

## Recovery Actions

A single, consistent vocabulary of recovery actions is used across every error type above — introducing a new one anywhere requires updating this list, not inventing a one-off:

| Action | Meaning |
|---|---|
| **Retry** | Resubmit the exact same operation with the exact same input. Never requires the user to re-enter anything already provided. |
| **Edit and resubmit** | For validation errors only — the fix is changing the input itself, not retrying it unchanged. |
| **Undo** | Reverses a just-completed destructive action within a short window (`Generator-Experience-Specification.md` §Undo/Retry, generation deletion). |
| **Back to Dashboard** | The universal fallback destination when no more specific recovery applies (`Empty-States.md` §Permission Denied). |
| **Sign in again** | For session expiration only, always returning the user to their prior context on success. |
| **Contact support / report issue** | Last resort, only surfaced after Retry has already failed or for Unexpected Errors (§Escalation). |

## User Messaging

Every error message in the product follows the same three-part structure, in order, restated from the founding principle: **(1) what happened**, in plain language, no jargon, no raw error codes; **(2) whose "fault" it is**, stated or clearly implied, so the user isn't left wondering if they broke something; **(3) what to do next**, always present unless there is genuinely no action available (rare — even a hard outage gets "try again in a moment").

Tone: calm, direct, never apologetic to the point of undermining confidence ("We're so sorry!" repeated across every error reads as performative) and never blaming the user even when the error is technically caused by their input (a validation error states the rule, not "You made a mistake").

## Escalation

- **When Retry fails repeatedly:** after a small number of consecutive failed retries on the same operation, the error state upgrades to include a "Report this issue" action (opens a pre-filled support contact with the relevant context — operation type, timestamp — attached automatically, never requiring the user to describe technical details they don't have).
- **When the failure is systemic:** if server-side monitoring would independently detect a broad outage, the client-facing message may reference that ("We're aware of an issue and are working on it.") only once that's actually true — never a preemptive claim of awareness the system doesn't yet have.
- **What escalation never does:** it never dead-ends the user with only a generic "contact us" and no in-product recovery attempted first — Retry (or the appropriate action from §Recovery Actions) is always offered before escalation, not instead of it.
