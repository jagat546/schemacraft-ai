import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="space-y-6">

      <LoginForm />

      <div className="rounded-2xl border border-violet-200 bg-white/70 p-5 text-center shadow-lg backdrop-blur">

        <p className="text-sm text-violet-600">
          New to SchemaCraft AI?
        </p>

        <Link
          href="/signup"
          className="mt-3 inline-flex items-center gap-2 font-semibold text-violet-700 transition hover:text-violet-900"
        >
          Create a free account
          <ArrowRight className="h-4 w-4" />
        </Link>

      </div>

    </div>
  )
}