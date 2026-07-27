import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/actions/auth"
import { getCurrentUser } from "@/lib/auth/current-user"

export async function TopNav() {
  const user = await getCurrentUser()

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b border-violet-200/70 bg-white/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <SidebarTrigger />

        <Separator
          orientation="vertical"
          className="h-6 bg-violet-200"
        />

        <div>
          <h1 className="text-lg font-bold text-violet-900">
            SchemaCraft AI
          </h1>
          <p className="text-xs text-violet-500">
            AI Database Schema Generator
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="hidden rounded-full bg-violet-100 px-4 py-2 text-sm font-medium text-violet-700 md:block">
            {user.email}
          </div>
        )}

        <ThemeToggle />

        <form action={signOut}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="border-violet-300 bg-white hover:bg-violet-100 hover:border-violet-400"
          >
            Sign out
          </Button>
        </form>
      </div>
    </header>
  )
}