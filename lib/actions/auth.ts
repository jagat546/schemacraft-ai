"use server"

import type { AuthError } from "@supabase/supabase-js"
import { redirect } from "next/navigation"

import { getSafeRedirectPath } from "@/lib/auth/safe-redirect"
import { createClient } from "@/lib/supabase/server"

export type AuthActionResult =
  | { ok: true; requiresConfirmation?: boolean }
  | { ok: false; error: string }

function mapAuthError(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Invalid email or password."
    case "user_already_exists":
      return "An account with this email already exists."
    case "weak_password":
      return "Password is too weak. Please use a longer password."
    case "email_not_confirmed":
      return "Please confirm your email before signing in."
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please try again shortly."
    default:
      return "Something went wrong. Please try again."
  }
}

export async function signUp(email: string, password: string): Promise<AuthActionResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { ok: false, error: mapAuthError(error) }
  }

  // TD-019: when this Supabase project requires email confirmation,
  // signUp() succeeds but establishes no session (data.session is null).
  // Redirecting to /dashboard here would just bounce straight back to
  // /login via proxy.ts with no explanation of why — tell the caller
  // instead of redirecting, so the form can show what actually happened.
  if (!data.session) {
    return { ok: true, requiresConfirmation: true }
  }

  redirect("/dashboard")
}

export async function signIn(
  email: string,
  password: string,
  next?: string | null
): Promise<AuthActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { ok: false, error: mapAuthError(error) }
  }

  redirect(getSafeRedirectPath(next) ?? "/dashboard")
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

// Deliberately never differentiates "no account for this email" from any
// other failure (rate limiting, transient send failure, ...): the response
// is the same regardless, so this action can't be used to enumerate which
// emails have accounts (Navigation-Experience-Specification.md
// §Password Reset — Step 1 Request).
export async function requestPasswordReset(email: string): Promise<void> {
  const supabase = await createClient()
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password/confirm`,
  })
  // Result intentionally ignored -- see the comment above.
}

export async function confirmPasswordReset(password: string): Promise<AuthActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { ok: false, error: mapAuthError(error) }
  }

  redirect("/dashboard")
}
