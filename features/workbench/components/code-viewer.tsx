"use client"

import { useTheme } from "next-themes"
import { Highlight, themes } from "prism-react-renderer"

import { cn } from "@/lib/utils"
import { OutputViewerFrame } from "@/features/workbench/components/output-viewer-frame"
import { OUTPUT_CONFIG } from "@/features/workbench/lib/output-config"
import type { OutputVariant } from "@/types/ui"

export function CodeViewer({
  content,
  variant,
}: {
  content: string
  variant: OutputVariant
}) {
  const { resolvedTheme } = useTheme()
  const config = OUTPUT_CONFIG[variant]
  const prismTheme = resolvedTheme === "dark" ? themes.vsDark : themes.vsLight

  return (
    <OutputViewerFrame label={config.label} content={content} variant={variant}>
      <Highlight code={content.trim()} language={config.language} theme={prismTheme}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} overflow-x-auto p-4 font-mono text-sm`}
            style={{ ...style, backgroundColor: "transparent" }}
          >
            {tokens.map((line, lineIndex) => {
              const { className: lineClassName, ...lineProps } = getLineProps({ line })
              return (
                <div key={lineIndex} className={cn(lineClassName, "table-row")} {...lineProps}>
                  <span className="table-cell w-px pr-4 text-right align-top whitespace-nowrap text-muted-foreground/50 select-none">
                    {lineIndex + 1}
                  </span>
                  <span className="table-cell">
                    {line.map((token, tokenIndex) => (
                      <span key={tokenIndex} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              )
            })}
          </pre>
        )}
      </Highlight>
    </OutputViewerFrame>
  )
}
