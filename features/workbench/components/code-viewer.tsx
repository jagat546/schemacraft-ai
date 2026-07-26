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
}: {
  content: string
  variant: OutputVariant
}) {
  const { resolvedTheme } = useTheme()
  const config = OUTPUT_CONFIG[variant]
  const trimmed = content.trim()
  const lineCount = trimmed === "" ? 1 : trimmed.split("\n").length
  const showMinimapToggle = lineCount >= MINIMAP_AUTO_THRESHOLD
  const [minimapEnabled, setMinimapEnabled] = useState(() => lineCount >= MINIMAP_AUTO_THRESHOLD)

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
            onClick={() => setMinimapEnabled((enabled) => !enabled)}
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
