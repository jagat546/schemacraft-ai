import { AppSidebar } from "@/features/shell/components/app-sidebar"
import { TopNav } from "@/features/shell/components/top-nav"
import { CommandPalette } from "@/features/shell/components/command-palette"
import { CommandRegistryProvider } from "@/features/shell/components/command-registry-provider"
import { DashboardChrome } from "@/features/shell/components/dashboard-chrome"
import { KeyboardShortcutProvider } from "@/features/shell/components/keyboard-shortcut-provider"
import { requireUser } from "@/lib/auth/require-user"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireUser()

  return (
    <KeyboardShortcutProvider>
      <CommandRegistryProvider>
        <DashboardChrome sidebar={<AppSidebar />} topNav={<TopNav />}>
          {children}
        </DashboardChrome>
        <CommandPalette />
      </CommandRegistryProvider>
    </KeyboardShortcutProvider>
  )
}
