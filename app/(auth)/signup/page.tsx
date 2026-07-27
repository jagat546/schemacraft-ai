import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { SignupForm } from "@/components/auth/signup-form"

export default function SignupPage() {
  return (
    <div className="space-y-6">

      <SignupForm />

      <div className="rounded-2xl border border-violet-200 bg-white/70 p-5 text-center shadow-lg backdrop-blur">

        <p className="text-sm text-violet-600">
          Already have an account?
        </p>

        <Link
          href="/login"
          className="mt-3 inline-flex items-center gap-2 font-semibold text-violet-700 transition hover:text-violet-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Sign In
        </Link>

      </div>

    </div>
  )
}