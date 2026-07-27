"use client"

import { useState, useTransition } from "react"
import { Loader2, Lock, Mail, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { signIn } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError(null)

    startTransition(async () => {
      const outcome = await signIn(email, password)

      if (!outcome.ok) {
        setError(outcome.error)
        toast.error(outcome.error)
        return
      }

      toast.success("Welcome back 👋")
    })
  }

  return (
    <div className="w-full rounded-3xl border border-violet-200 bg-white p-8 shadow-2xl">

      <div className="mb-8 text-center">

        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">

          <Sparkles className="h-8 w-8 text-white" />

        </div>

        <h2 className="text-3xl font-bold text-violet-900">
          Welcome Back
        </h2>

        <p className="mt-2 text-violet-600">
          Sign in to continue building AI-powered database schemas.
        </p>

      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >

        <div>

          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-violet-900"
          >
            Email Address
          </label>

          <div className="relative">

            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-400" />

            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12 rounded-xl border-violet-200 pl-12 focus:border-violet-500"
            />

          </div>

        </div>

        <div>

          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold text-violet-900"
          >
            Password
          </label>

          <div className="relative">

            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-400" />

            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 rounded-xl border-violet-200 pl-12 focus:border-violet-500"
            />

          </div>

        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="h-12 w-full rounded-xl text-base font-semibold"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Signing In...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Sign In
            </>
          )}
        </Button>

      </form>

    </div>
  )
}