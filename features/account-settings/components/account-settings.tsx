"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { InlineError } from "@/components/patterns/inline-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { confirmPasswordReset, signOutAllSessionsAction } from "@/lib/actions/auth"

// Delete-account is deliberately not implemented here. Supabase Auth has
// no anon-key-callable "delete my own account" method -- that requires
// either a service-role client (bypasses RLS entirely; nothing in this
// codebase uses one today) or a SECURITY DEFINER Postgres function scoped
// to auth.uid(). That's a real, security-sensitive architectural decision
// (which mechanism, how it's reviewed) this task does not make
// unilaterally -- tracked as its own follow-up, same spirit as AD-004.
export function AccountSettings({ email }: { email: string }) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isSigningOutAll, startSignOutAllTransition] = useTransition()

  function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }

    startTransition(async () => {
      const outcome = await confirmPasswordReset(password, { redirect: false })
      if (!outcome.ok) {
        setError(outcome.error)
        toast.error(outcome.error)
        return
      }
      setPassword("")
      setConfirmPassword("")
      toast.success("Password updated.")
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-h3 font-semibold text-text-primary">Account</h3>
        <p className="text-body-sm text-text-secondary">{email}</p>
      </div>

      <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="account-new-password" className="text-sm font-medium">
            New password
          </label>
          <Input
            id="account-new-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="account-confirm-password" className="text-sm font-medium">
            Confirm new password
          </label>
          <Input
            id="account-confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
        {error ? <InlineError message={error} /> : null}
        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? "Updating…" : "Change password"}
        </Button>
      </form>

      <div className="flex flex-col gap-2 border-t border-border-subtle pt-4">
        <h4 className="text-body font-medium text-text-primary">Sign out everywhere</h4>
        <p className="text-body-sm text-text-secondary">
          Sign out of every device where you&apos;re currently signed in.
        </p>
        <Button
          variant="outline"
          className="w-fit"
          disabled={isSigningOutAll}
          onClick={() => startSignOutAllTransition(() => signOutAllSessionsAction())}
        >
          {isSigningOutAll ? "Signing out…" : "Sign out of all sessions"}
        </Button>
      </div>
    </div>
  )
}
