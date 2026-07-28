import "server-only"

import { redirect } from "next/navigation"

import { getSessionResult } from "@/lib/auth/session-result"

// Reimplemented on top of getSessionResult() (AD-004) so there is exactly
// one place that decides "is there a valid session" -- this function's own
// exported signature and behavior (redirect to /login when missing,
// otherwise return the user) are unchanged for every existing caller.
export async function requireUser() {
  const result = await getSessionResult()

  if (result.status === "SESSION_EXPIRED") {
    redirect("/login")
  }

  return result.user
}
