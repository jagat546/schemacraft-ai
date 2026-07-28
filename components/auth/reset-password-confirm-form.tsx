"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { InlineError } from "@/components/patterns/inline-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { confirmPasswordReset } from "@/lib/actions/auth"

export function ResetPasswordConfirmForm() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }

    startTransition(async () => {
      // On success, confirmPasswordReset redirects to /dashboard from
      // inside the Server Action -- there is no "ok: true" branch to
      // handle here, same as signIn/signUp's existing pattern.
      const outcome = await confirmPasswordReset(password)
      if (!outcome.ok) {
        setError(outcome.error)
        toast.error(outcome.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          New password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm-password" className="text-sm font-medium">
          Confirm new password
        </label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </div>
      {error && <InlineError message={error} id="confirm-password-error" />}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Updating…" : "Update password"}
      </Button>
    </form>
  )
}
