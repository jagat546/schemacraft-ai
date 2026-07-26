"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppearanceSettings } from "@/features/account-settings/components/appearance-settings"
import { BillingSettings } from "@/features/account-settings/components/billing-settings"
import { KeyboardShortcutsSettings } from "@/features/account-settings/components/keyboard-shortcuts-settings"

// Dashboard-Experience-Specification.md §Settings: an in-page category
// list, collapsing to a tab strip below `sm`. Reuses the existing Tabs
// primitive (already used by OutputTabs) rather than a bespoke layout --
// its default horizontal, scrollable TabsList *is* the mobile tab-strip
// behavior; sm:flex-col turns the same list into a vertical sidebar
// alongside the content on wider viewports.
//
// Part 1 of S4-010 (Sprint-04-Implementation-Roadmap.md's own suggestion:
// split this task's largest-in-sprint scope into sequential landings) --
// Preferences, Accessibility, Account, Developer, and Reset land in
// S4-010B, extending this same category list once their persistence
// surface (a new user_preferences table) is confirmed and built.
const CATEGORIES = [
  { value: "appearance", label: "Appearance" },
  { value: "keyboard-shortcuts", label: "Keyboard Shortcuts" },
  { value: "billing", label: "Billing" },
] as const

export function SettingsShell() {
  return (
    <Tabs defaultValue="appearance" className="flex flex-col gap-6 sm:flex-row">
      <TabsList className="flex h-auto w-full shrink-0 flex-row overflow-x-auto sm:w-48 sm:flex-col sm:overflow-visible">
        {CATEGORIES.map((category) => (
          <TabsTrigger key={category.value} value={category.value} className="sm:justify-start">
            {category.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="min-w-0 flex-1">
        <TabsContent value="appearance">
          <AppearanceSettings />
        </TabsContent>
        <TabsContent value="keyboard-shortcuts">
          <KeyboardShortcutsSettings />
        </TabsContent>
        <TabsContent value="billing">
          <BillingSettings />
        </TabsContent>
      </div>
    </Tabs>
  )
}
