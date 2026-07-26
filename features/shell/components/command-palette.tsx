"use client"

import { Fragment } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { LogOutIcon, MonitorIcon, MoonIcon, SparklesIcon, SunIcon } from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { signOut } from "@/lib/actions/auth"
import { useUiStore } from "@/lib/stores/ui-store"
import { NAV_ITEMS } from "@/features/shell/lib/nav-items"
import { useKeyboardShortcut } from "@/features/shell/components/keyboard-shortcut-provider"
import { useRegisteredCommands } from "@/features/shell/components/command-registry-provider"

// Groups registered commands by their own `group` label, preserving each
// group's first-seen order -- callers decide their own heading (e.g. the
// Workbench registers under "Workbench"), this stays generic rather than
// hardcoding any one feature's group name.
function groupRegisteredCommands(
  commands: ReturnType<typeof useRegisteredCommands>
): Array<[string, typeof commands]> {
  const groups = new Map<string, typeof commands>()
  for (const command of commands) {
    const existing = groups.get(command.group)
    if (existing) {
      existing.push(command)
    } else {
      groups.set(command.group, [command])
    }
  }
  return Array.from(groups.entries())
}

const THEME_ITEMS = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
] as const

export function CommandPalette() {
  const open = useUiStore((state) => state.commandPaletteOpen)
  const setOpen = useUiStore((state) => state.setCommandPaletteOpen)
  const toggleOpen = useUiStore((state) => state.toggleCommandPalette)
  const router = useRouter()
  const { setTheme } = useTheme()
  const registeredGroups = groupRegisteredCommands(useRegisteredCommands())

  useKeyboardShortcut("mod+k", () => toggleOpen(), "Open command palette", { allowInInput: true })

  function runCommand(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <CommandDialog open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.href}
              value={`Go to ${item.label}`}
              onSelect={() => runCommand(() => router.push(item.href))}
            >
              <SparklesIcon />
              <span>Go to {item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {registeredGroups.map(([group, commands]) => (
          <Fragment key={group}>
            <CommandSeparator />
            <CommandGroup heading={group}>
              {commands.map((command) => (
                <CommandItem
                  key={command.label}
                  value={command.label}
                  onSelect={() => runCommand(command.onSelect)}
                >
                  {command.icon ? <command.icon /> : null}
                  <span>{command.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </Fragment>
        ))}
        <CommandSeparator />
        <CommandGroup heading="Theme">
          {THEME_ITEMS.map(({ value, label, icon: Icon }) => (
            <CommandItem
              key={value}
              value={`Theme: ${label}`}
              onSelect={() => runCommand(() => setTheme(value))}
            >
              <Icon />
              <span>{label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Account">
          <CommandItem value="Sign out" onSelect={() => runCommand(() => void signOut())}>
            <LogOutIcon />
            <span>Sign out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
