import { SettingsShell } from "@/features/account-settings/components/settings-shell"

export function AccountSettingsView() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account Settings</h1>
        <p className="text-sm text-muted-foreground">
          Preferences that apply across every project.
        </p>
      </div>
      <SettingsShell />
    </div>
  )
}
