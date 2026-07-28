// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  CommandRegistryProvider,
  useRegisterCommands,
  useRegisteredCommands,
} from "@/features/shell/components/command-registry-provider"

function Registrar({ group, label }: { group: string; label: string }) {
  useRegisterCommands([{ group, label, onSelect: () => {} }])
  return null
}

function CommandList() {
  const commands = useRegisteredCommands()
  return (
    <ul>
      {commands.map((command) => (
        <li key={command.group + command.label}>
          {command.group}: {command.label}
        </li>
      ))}
    </ul>
  )
}

describe("CommandRegistryProvider registry", () => {
  it("exposes exactly what was registered, not a separately-maintained list", () => {
    render(
      <CommandRegistryProvider>
        <Registrar group="Workbench" label="Toggle fullscreen" />
        <Registrar group="Navigation" label="Go to Dashboard" />
        <CommandList />
      </CommandRegistryProvider>
    )

    expect(screen.getByText("Workbench: Toggle fullscreen")).toBeTruthy()
    expect(screen.getByText("Navigation: Go to Dashboard")).toBeTruthy()
  })

  // This is the mechanism behind "Workbench-scoped commands only while the
  // Workbench is focused" (Workbench-Experience-Specification.md §Command
  // Palette): a route-scoped registrar is just a component that mounts only
  // on that route, so unmounting it (simulating navigating away) must make
  // its commands disappear -- there is no separate pathname-based filter to
  // get wrong.
  it("removes a registrar's commands the instant it unmounts, simulating navigating away from its route", () => {
    function Scene({ showWorkbenchCommands }: { showWorkbenchCommands: boolean }) {
      return (
        <CommandRegistryProvider>
          {showWorkbenchCommands && <Registrar group="Workbench" label="Toggle fullscreen" />}
          <CommandList />
        </CommandRegistryProvider>
      )
    }

    const { rerender } = render(<Scene showWorkbenchCommands={true} />)
    expect(screen.getByText("Workbench: Toggle fullscreen")).toBeTruthy()

    rerender(<Scene showWorkbenchCommands={false} />)
    expect(screen.queryByText("Workbench: Toggle fullscreen")).toBeNull()
  })

  it("throws when used outside a CommandRegistryProvider", () => {
    function Unwrapped() {
      useRegisteredCommands()
      return null
    }

    expect(() => render(<Unwrapped />)).toThrow(
      "useRegisteredCommands must be used within a CommandRegistryProvider"
    )
  })
})
