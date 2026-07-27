import { Database, Sparkles } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="relative min-h-svh overflow-hidden bg-gradient-to-br from-violet-50 via-white to-fuchsia-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-fuchsia-300/30 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="relative mx-auto grid min-h-svh w-full max-w-7xl items-center gap-12 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-8 inline-flex items-center gap-3 rounded-2xl border border-violet-200 bg-white/80 px-4 py-3 shadow-lg shadow-violet-200/30 backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
                <Database className="h-5 w-5" />
              </div>

              <div>
                <p className="font-bold text-violet-950">SchemaCraft AI</p>
                <p className="text-xs text-violet-500">
                  AI-powered database design
                </p>
              </div>
            </div>

            <h1 className="text-5xl font-bold leading-tight text-violet-950">
              Design production-ready database schemas with AI.
            </h1>

            <p className="mt-6 text-lg leading-8 text-violet-700">
              Turn natural-language requirements into SQL, Drizzle ORM models,
              Mermaid ER diagrams, sample JSON, and documentation in seconds.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-violet-200 bg-white/75 p-5 shadow-lg shadow-violet-200/20 backdrop-blur">
                <Sparkles className="mb-3 h-6 w-6 text-violet-600" />
                <p className="font-semibold text-violet-950">AI generation</p>
                <p className="mt-1 text-sm text-violet-600">
                  Create complete schemas from plain-English prompts.
                </p>
              </div>

              <div className="rounded-3xl border border-violet-200 bg-white/75 p-5 shadow-lg shadow-violet-200/20 backdrop-blur">
                <Database className="mb-3 h-6 w-6 text-violet-600" />
                <p className="font-semibold text-violet-950">
                  Multiple outputs
                </p>
                <p className="mt-1 text-sm text-violet-600">
                  SQL, Drizzle, JSON, docs, and ER diagrams together.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex w-full items-center justify-center">
          <div className="w-full max-w-md">{children}</div>
        </section>
      </div>
    </main>
  )
}