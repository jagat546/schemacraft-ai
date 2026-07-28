"use client"

import { useState, useTransition } from "react"

import { requestPasswordReset } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// requestPasswordReset returns void, not a typed result -- there is no
// success/failure branch to render differently here. Whether or not the
// email matches an account, the UI response is this same neutral message
// (Navigation-Experience-Specification.md §Password Reset, a deliberate
// security choice, not an oversight).
export function ResetPasswordForm() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      await requestPasswordReset(email)
      setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <p className="text-body text-text-secondary">
        If an account exists for that email, we&apos;ve sent a reset link.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  )
}
