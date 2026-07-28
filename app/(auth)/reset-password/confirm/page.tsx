import { AlertCircleIcon } from "lucide-react"

import { ResetPasswordConfirmForm } from "@/components/auth/reset-password-confirm-form"
import { ErrorState } from "@/components/patterns/error-state"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export default async function ResetPasswordConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code } = await searchParams
  const supabase = await createClient()

  const exchangeError = code
    ? (await supabase.auth.exchangeCodeForSession(code)).error
    : new Error("Missing reset code")

  if (exchangeError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reset link invalid or expired</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState
            icon={<AlertCircleIcon />}
            message="This password reset link is invalid or has expired."
            action={{ kind: "retry", label: "Request a new link", href: "/reset-password" }}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Enter a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordConfirmForm />
      </CardContent>
    </Card>
  )
}
