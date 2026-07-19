"use client"

import { useEffect, useId, useState } from "react"
import { useTheme } from "next-themes"

import { OutputActions } from "@/components/dashboard/output-actions"
import { ScrollArea } from "@/components/ui/scroll-area"
import { OUTPUT_CONFIG } from "@/lib/output-config"

type RenderState =
  | { status: "loading" }
  | { status: "success"; svg: string }
  | { status: "error" }

export function MermaidViewer({ content }: { content: string }) {
  const config = OUTPUT_CONFIG.mermaid
  const { resolvedTheme } = useTheme()
  const rawId = useId()
  const diagramId = `mermaid-diagram-${rawId.replace(/:/g, "")}`
  const [state, setState] = useState<RenderState>({ status: "loading" })

  useEffect(() => {
    let cancelled = false

    async function renderDiagram() {
      try {
        // mermaid pulls in d3/dagre and is large; import it lazily so it never
        // lands in the initial dashboard bundle, only in whatever chunk
        // actually mounts this component.
        const { default: mermaid } = await import("mermaid")
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: resolvedTheme === "dark" ? "dark" : "default",
          // Mermaid's default failure behavior draws its own "bomb icon"
          // error diagram into a temporary element it appends to
          // document.body, outside our container - and leaks that element on
          // the parse-failure path. We render our own fallback UI instead, so
          // suppress Mermaid's built-in error rendering entirely.
          suppressErrorRendering: true,
        })
        const { svg } = await mermaid.render(diagramId, content)
        if (!cancelled) {
          setState({ status: "success", svg })
        }
      } catch {
        // Invalid/unparseable Mermaid source is expected (the diagram source
        // is model-generated and never syntax-validated server-side) - fail
        // into the local fallback state rather than letting the error escape
        // and take down the rest of the page.
        if (!cancelled) {
          setState({ status: "error" })
        }
      }
    }

    renderDiagram()

    return () => {
      cancelled = true
    }
  }, [content, diagramId, resolvedTheme])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{config.label}</span>
        <OutputActions content={content} variant="mermaid" />
      </div>
      <ScrollArea className="h-[400px] rounded-md border bg-muted/30">
        <div className="p-4">
          {state.status === "loading" && (
            <p className="text-sm text-muted-foreground">Rendering diagram…</p>
          )}
          {state.status === "success" && (
            // mermaid.render() only returns a serialized SVG string - there is
            // no React-element-based API - so this is the one place in the
            // app where injecting markup is unavoidable. securityLevel:
            // "strict" (set above) is Mermaid's own built-in mitigation for
            // this, since the diagram source is model-generated, not
            // hand-authored. See the architectural notes for why DOMPurify
            // is intentionally not layered on top at this stage.
            <div
              className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: state.svg }}
            />
          )}
          {state.status === "error" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">The diagram could not be rendered.</p>
              <pre className="overflow-x-auto rounded-md border bg-background p-3 font-mono text-xs">
                {content}
              </pre>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
