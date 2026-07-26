import "server-only"

import { getCurrentUser } from "@/lib/auth/current-user"

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>

// AD-004 (docs/architecture/AD-004-session-expiration-handling.md),
// Solution B: a non-redirecting counterpart to requireUser(), for
// client-driven interactive workflows (the Generator, S4-012) that need to
// render their own "your session has expired" ErrorState and preserve
// in-progress input, rather than being redirected away from the page
// entirely. requireUser() itself is unchanged in behavior for every
// existing page-level caller -- see require-user.ts.
export type SessionResult =
  | { status: "OK"; user: CurrentUser }
  | { status: "SESSION_EXPIRED" }

export async function getSessionResult(): Promise<SessionResult> {
  const user = await getCurrentUser()

  if (!user) {
    return { status: "SESSION_EXPIRED" }
  }

  return { status: "OK", user }
}
