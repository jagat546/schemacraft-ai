import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/features/shell/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/actions/auth"
import { getCurrentUser } from "@/lib/auth/current-user"

export async function TopNav() {
  const user = await getCurrentUser()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-5" />
        <span className="text-sm font-medium">Generator</span>
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
        )}
        <ThemeToggle />
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  )
}
