import { strToU8, zip, type AsyncZippable } from "fflate"

import { OUTPUT_CONFIG } from "@/features/workbench/lib/output-config"
import type { GeneratedSchema } from "@/types/schema"

// MermaidViewer keeps its rendered SVG entirely internal (component state,
// never exposed via props/context), and it's the one artifact whose
// "rendered" form doesn't already exist as a string anywhere in this
// module -- so the export independently re-renders it, using the exact
// same configuration MermaidViewer itself uses, rather than refactoring
// that already-working, security-reviewed component to expose its output.
async function renderMermaidSvg(mermaidSource: string): Promise<string | null> {
  try {
    const { default: mermaid } = await import("mermaid")
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
    })
    const { svg } = await mermaid.render(`export-erd-${Date.now()}`, mermaidSource)
    return svg
  } catch {
    // Same reasoning as MermaidViewer's own catch: the diagram source is
    // model-generated and never syntax-validated server-side, so a render
    // failure here is expected, not exceptional -- the export just omits
    // the rendered SVG rather than failing the whole zip.
    return null
  }
}

// fflate's zip() is async/worker-capable, not zipSync's synchronous main-
// thread pass -- chosen specifically per this task's own risk callout
// (verify performance for a large schema's artifacts before merging).
export async function buildExportZip(result: GeneratedSchema): Promise<Blob> {
  const files: AsyncZippable = {
    [OUTPUT_CONFIG.sql.filename]: strToU8(result.sql),
    [OUTPUT_CONFIG.drizzle.filename]: strToU8(result.drizzle),
    [OUTPUT_CONFIG.json.filename]: strToU8(result.json),
  }

  if (result.documentation) {
    files[OUTPUT_CONFIG.documentation.filename] = strToU8(result.documentation)
  }

  if (result.mermaidDiagram) {
    files[OUTPUT_CONFIG.mermaid.filename] = strToU8(result.mermaidDiagram)

    const svg = await renderMermaidSvg(result.mermaidDiagram)
    if (svg) {
      files["schema-diagram.svg"] = strToU8(svg)
    }
  }

  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, (error, data) => {
      if (error) {
        reject(error)
        return
      }
      resolve(data)
    })
  })

  // fflate types zip()'s callback data as Uint8Array<ArrayBufferLike> (it
  // could theoretically wrap a SharedArrayBuffer), but Blob's constructor
  // wants the concrete ArrayBuffer-backed variant. fflate never actually
  // produces a SharedArrayBuffer-backed result -- Uint8Array.from() copies
  // into a fresh, definitely-plain-ArrayBuffer Uint8Array to satisfy the
  // type without an unsafe cast.
  return new Blob([Uint8Array.from(zipped)], { type: "application/zip" })
}
