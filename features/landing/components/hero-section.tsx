import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HeroSandbox } from "@/features/landing/components/hero-sandbox"

export function HeroSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center md:py-28">
      <Badge variant="outline">AI-powered schema design</Badge>
      <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
        Describe your data. Get a database.
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground text-balance">
        SchemaCraft AI turns a plain-English description into a SQL schema, a Drizzle ORM
        model, sample data, documentation, and an entity-relationship diagram — organized into
        projects you can come back to.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {isAuthenticated ? (
          <Button size="lg" nativeButton={false} render={<Link href="/dashboard" />}>
            Go to Dashboard
            <ArrowRightIcon />
          </Button>
        ) : (
          <>
            <Button size="lg" nativeButton={false} render={<Link href="/signup" />}>
              Get started
              <ArrowRightIcon />
            </Button>
            <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/login" />}>
              Sign in
            </Button>
          </>
        )}
      </div>
      {!isAuthenticated && (
        <div className="w-full pt-4">
          <HeroSandbox />
        </div>
      )}
    </section>
  )
}
