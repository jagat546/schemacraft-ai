import type { Monaco } from "@monaco-editor/react"

// Design System 2.0 token values, hand-copied from app/globals.css. Monaco's
// theme API (`editor.defineTheme`) takes a plain object at runtime, not CSS
// custom properties -- it has no way to read `var(--surface-2)`, so these
// values must be kept in sync with globals.css by hand. `inherit: true` on
// both themes keeps Monaco's own battle-tested vs/vs-dark token-color rules
// (keywords, strings, comments, etc.) -- only the editor *chrome* (surfaces,
// borders, cursor, selection) is re-pointed at our tokens.
const LIGHT_COLORS = {
  "editor.background": "#ffffff", // --surface-2
  "editor.foreground": "#18181b", // --text-primary
  "editorLineNumber.foreground": "#71717a", // --text-muted
  "editorLineNumber.activeForeground": "#52525b", // --text-secondary
  "editorCursor.foreground": "#7c3aed", // --accent-violet
  "editor.selectionBackground": "#7c3aed33",
  "editorWidget.background": "#ffffff", // --surface-3
  "editorWidget.border": "#00000014", // --border-subtle
  "editorSuggestWidget.background": "#ffffff",
  "editor.findMatchBackground": "#7c3aed4d",
  "editor.findMatchHighlightBackground": "#7c3aed26",
}

const DARK_COLORS = {
  "editor.background": "#121215", // --surface-2
  "editor.foreground": "#fafafa", // --text-primary
  "editorLineNumber.foreground": "#71717a", // --text-muted
  "editorLineNumber.activeForeground": "#a1a1aa", // --text-secondary
  "editorCursor.foreground": "#7c3aed", // --accent-violet
  "editor.selectionBackground": "#7c3aed4d",
  "editorWidget.background": "#18181b", // --surface-3
  "editorWidget.border": "#ffffff12", // --border-subtle
  "editorSuggestWidget.background": "#18181b",
  "editor.findMatchBackground": "#7c3aed66",
  "editor.findMatchHighlightBackground": "#7c3aed33",
}

export const SCHEMACRAFT_LIGHT_THEME = "schemacraft-light"
export const SCHEMACRAFT_DARK_THEME = "schemacraft-dark"

export function defineSchemaCraftMonacoThemes(monaco: Monaco): void {
  monaco.editor.defineTheme(SCHEMACRAFT_LIGHT_THEME, {
    base: "vs",
    inherit: true,
    rules: [],
    colors: LIGHT_COLORS,
  })
  monaco.editor.defineTheme(SCHEMACRAFT_DARK_THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: DARK_COLORS,
  })
}
