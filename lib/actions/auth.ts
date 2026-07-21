"use server"

import type { AuthError } from "@supabase/supabase-js"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export type AuthActionResult = { ok: true } | { ok: false; error: string }

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
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { ok: false, error: mapAuthError(error) }
  }

  redirect("/dashboard")
}

export async function signIn(email: string, password: string): Promise<AuthActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { ok: false, error: mapAuthError(error) }
  }

  redirect("/dashboard")
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
