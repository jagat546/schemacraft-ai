import Link from "next/link"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

export function MarketingNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header className="border-b border-border-subtle bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Sparkles className="size-5 shrink-0 text-primary" />
          <span className="font-semibold">SchemaCraft AI</span>
        </Link>
        {isAuthenticated ? (
          <Button size="sm" nativeButton={false} render={<Link href="/dashboard" />}>
            Dashboard
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login" />}>
              Sign in
            </Button>
            <Button size="sm" nativeButton={false} render={<Link href="/signup" />}>
              Get started
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
