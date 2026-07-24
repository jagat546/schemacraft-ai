import { AppSidebar } from "@/features/shell/components/app-sidebar"
import { TopNav } from "@/features/shell/components/top-nav"
import { CommandPalette } from "@/features/shell/components/command-palette"
import { KeyboardShortcutProvider } from "@/features/shell/components/keyboard-shortcut-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { requireUser } from "@/lib/auth/require-user"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireUser()

  return (
    <KeyboardShortcutProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <TopNav />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <CommandPalette />
    </KeyboardShortcutProvider>
  )
}
