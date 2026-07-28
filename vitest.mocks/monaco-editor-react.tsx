// Test-only stand-in for @monaco-editor/react, aliased in via
// vitest.config.ts's "dom" project. The real package needs Monaco's AMD
// bundle and language workers, fetched from a CDN at runtime -- neither of
// which exist in a jsdom test environment (no network access, no real
// Worker/canvas support). This stub renders enough of the real component's
// observable surface (readOnly/language/value as data attributes, the
// value itself as text) for tests to assert against, without needing an
// actual editor instance.
import type { editor } from "monaco-editor"

interface StubEditorProps {
  height?: string | number
  language?: string
  value?: string
  theme?: string
  beforeMount?: (monaco: unknown) => void
  options?: editor.IStandaloneEditorConstructionOptions
}

export default function Editor({ language, value, theme, options }: StubEditorProps) {
  return (
    <div
      data-testid="monaco-editor-stub"
      data-language={language}
      data-theme={theme}
      data-readonly={options?.readOnly ?? false}
      data-minimap-enabled={options?.minimap?.enabled ?? false}
    >
      {value}
    </div>
  )
}
