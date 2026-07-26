"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import dynamic from "next/dynamic"

import { Button } from "@/components/ui/button"
import { OutputViewerFrame } from "@/features/workbench/components/output-viewer-frame"
import {
  SCHEMACRAFT_DARK_THEME,
  SCHEMACRAFT_LIGHT_THEME,
  defineSchemaCraftMonacoThemes,
} from "@/features/workbench/lib/monaco-theme"
import { OUTPUT_CONFIG } from "@/features/workbench/lib/output-config"
import type { OutputVariant } from "@/types/ui"

// Monaco's core is multi-megabyte and only ever needed once the Workbench
// actually renders a code artifact -- dynamic-imported exactly like
// `mermaid` is in mermaid-viewer.tsx (same lazy-load discipline, not a new
// technique), and with ssr:false since Monaco reaches for `window` at
// module-eval time and has no server-renderable fallback.
//
// This keeps the default @monaco-editor/react loading strategy: fetch the
// Monaco AMD bundle + its language workers from a CDN at runtime, rather
// than self-hosting `monaco-editor` and wiring monaco-editor-webpack-plugin.
// Next.js 16 uses Turbopack by default (both `next dev` and `next build`),
// and that plugin -- the standard way to self-host Monaco's workers -- has
// no Turbopack equivalent. CDN loading sidesteps the bundler-worker problem
// entirely instead of fighting it, at the cost of a runtime dependency on
// the CDN; this project has no CSP configured today, so there's nothing to
// allowlist yet, but a future CSP will need `script-src`/`worker-src`/
// `connect-src` entries for it.
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-muted-foreground">Loading editor…</p>,
})

// Workbench-Experience-Specification.md §Monaco Integration: below this many
// lines a minimap adds visual noise without helping navigation, so it starts
// suppressed; at/above it, it starts on but stays user-toggleable either way.
const MINIMAP_AUTO_THRESHOLD = 40

export function CodeViewer({
  content,
  variant,
  minimapOverride,
  onMinimapOverrideChange,
}: {
  content: string
  variant: OutputVariant
  // Workbench-Experience-Specification.md §Mini Map: the user's explicit
  // on/off choice persists per project, shared across all three code tabs --
  // that requires this to be lifted out of CodeViewer into whichever parent
  // owns that persistence (Workbench). Omitting `onMinimapOverrideChange`
  // entirely preserves this component's original auto-threshold behavior
  // byte-for-byte, which is what every other caller (Generator, sandbox,
  // landing's Interactive Demo) still gets.
  //
  // "Managed" mode is keyed off the *callback* being provided, not off
  // `minimapOverride` itself being non-null: the very first render in
  // Workbench has no persisted choice yet (null = "no explicit preference,
  // use the auto-threshold"), and toggling it for the first time must still
  // write through the callback rather than falling back to local state --
  // otherwise that first toggle would never actually persist.
  minimapOverride?: boolean | null
  onMinimapOverrideChange?: (enabled: boolean) => void
}) {
  const { resolvedTheme } = useTheme()
  const config = OUTPUT_CONFIG[variant]
  const trimmed = content.trim()
  const lineCount = trimmed === "" ? 1 : trimmed.split("\n").length
  const autoThresholdDefault = lineCount >= MINIMAP_AUTO_THRESHOLD
  const isManaged = onMinimapOverrideChange !== undefined
  const showMinimapToggle = isManaged || autoThresholdDefault
  const [localMinimapEnabled, setLocalMinimapEnabled] = useState(autoThresholdDefault)
  const minimapEnabled = isManaged
    ? (minimapOverride ?? autoThresholdDefault)
    : localMinimapEnabled

  function handleToggleMinimap() {
    if (isManaged) {
      onMinimapOverrideChange(!minimapEnabled)
    } else {
      setLocalMinimapEnabled((enabled) => !enabled)
    }
  }

  return (
    <OutputViewerFrame
      label={config.label}
      content={content}
      variant={variant}
      scrollable={false}
      headerExtra={
        showMinimapToggle ? (
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={minimapEnabled}
            onClick={handleToggleMinimap}
          >
            {minimapEnabled ? "Hide minimap" : "Show minimap"}
          </Button>
        ) : null
      }
    >
      <Editor
        height="100%"
        language={config.language}
        value={content}
        theme={resolvedTheme === "dark" ? SCHEMACRAFT_DARK_THEME : SCHEMACRAFT_LIGHT_THEME}
        beforeMount={defineSchemaCraftMonacoThemes}
        options={{
          readOnly: true,
          domReadOnly: true,
          minimap: { enabled: minimapEnabled },
          fontSize: 13,
          fontFamily: "var(--font-mono)",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          renderLineHighlight: "none",
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
        }}
      />
    </OutputViewerFrame>
  )
}
