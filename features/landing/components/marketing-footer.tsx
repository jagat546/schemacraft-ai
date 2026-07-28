import Link from "next/link"
import { Sparkles } from "lucide-react"

export function MarketingFooter() {
  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:px-6">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 shrink-0" />
          <span>SchemaCraft AI</span>
        </div>
        <p>Generate SQL schema, Drizzle models, and sample data from a prompt.</p>
        <div className="flex items-center gap-4">
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
          <Link href="/signup" className="hover:text-foreground">
            Sign up
          </Link>
        </div>
      </div>
      <div className="border-t border-border-subtle px-4 py-4 text-center text-xs text-muted-foreground md:px-6">
        © {new Date().getFullYear()} SchemaCraft AI.
      </div>
    </footer>
  )
}
