"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccessibilitySettings } from "@/features/account-settings/components/accessibility-settings"
import { AccountSettings } from "@/features/account-settings/components/account-settings"
import { AppearanceSettings } from "@/features/account-settings/components/appearance-settings"
import { BillingSettings } from "@/features/account-settings/components/billing-settings"
import { DeveloperSettings } from "@/features/account-settings/components/developer-settings"
import { KeyboardShortcutsSettings } from "@/features/account-settings/components/keyboard-shortcuts-settings"
import { PreferencesSettings } from "@/features/account-settings/components/preferences-settings"

// Dashboard-Experience-Specification.md §Settings: an in-page category
// list, collapsing to a tab strip below `sm`. Reuses the existing Tabs
// primitive (already used by OutputTabs) rather than a bespoke layout --
// its default horizontal, scrollable TabsList *is* the mobile tab-strip
// behavior; sm:flex-col turns the same list into a vertical sidebar
// alongside the content on wider viewports.
//
// All 8 roadmapped categories are represented. Preferences and Developer
// are genuinely disabled placeholders (not live forms) -- both need the
// user_preferences table, which has no migration applied yet and requires
// explicit sign-off before one runs (S4-010B). Delete-account is
// deliberately absent from Account (see account-settings.tsx's own
// comment) pending its own architectural decision.
const CATEGORIES = [
  { value: "preferences", label: "Preferences" },
  { value: "appearance", label: "Appearance" },
  { value: "accessibility", label: "Accessibility" },
  { value: "account", label: "Account" },
  { value: "billing", label: "Billing" },
  { value: "keyboard-shortcuts", label: "Keyboard Shortcuts" },
  { value: "developer", label: "Developer" },
] as const

export function SettingsShell({
  email,
  initialReducedMotion,
  initialHighContrast,
}: {
  email: string
  initialReducedMotion: boolean
  initialHighContrast: boolean
}) {
  return (
    <Tabs defaultValue="appearance" className="flex flex-col gap-6 sm:flex-row!">
      <TabsList className="flex h-auto w-full shrink-0 flex-row overflow-x-auto sm:w-48 sm:h-auto! sm:flex-col! sm:self-start sm:overflow-visible">
        {CATEGORIES.map((category) => (
          <TabsTrigger key={category.value} value={category.value} className="sm:flex-none sm:justify-start">
            {category.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="min-w-0 flex-1">
        <TabsContent value="preferences">
          <PreferencesSettings />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearanceSettings />
        </TabsContent>
        <TabsContent value="accessibility">
          <AccessibilitySettings
            initialReducedMotion={initialReducedMotion}
            initialHighContrast={initialHighContrast}
          />
        </TabsContent>
        <TabsContent value="account">
          <AccountSettings email={email} />
        </TabsContent>
        <TabsContent value="billing">
          <BillingSettings />
        </TabsContent>
        <TabsContent value="keyboard-shortcuts">
          <KeyboardShortcutsSettings />
        </TabsContent>
        <TabsContent value="developer">
          <DeveloperSettings />
        </TabsContent>
      </div>
    </Tabs>
  )
}
