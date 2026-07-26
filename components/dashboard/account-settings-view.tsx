import { cookies } from "next/headers"

import { SettingsShell } from "@/features/account-settings/components/settings-shell"
import { getCurrentUser } from "@/lib/auth/current-user"

export async function AccountSettingsView() {
  const user = await getCurrentUser()
  const cookieStore = await cookies()

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account Settings</h1>
        <p className="text-sm text-muted-foreground">
          Preferences that apply across every project.
        </p>
      </div>
      <SettingsShell
        email={user?.email ?? ""}
        initialReducedMotion={cookieStore.get("reduced-motion")?.value === "true"}
        initialHighContrast={cookieStore.get("high-contrast")?.value === "true"}
      />
    </div>
  )
}
