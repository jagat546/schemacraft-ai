"use client"

import { useTheme } from "next-themes"
import { Highlight, themes } from "prism-react-renderer"

import { ScrollArea } from "@/components/ui/scroll-area"
import { OutputActions } from "@/features/workbench/components/output-actions"
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{config.label}</span>
        <OutputActions content={content} variant={variant} />
      </div>
      <ScrollArea className="h-[400px] rounded-md border bg-muted/30">
        <Highlight code={content.trim()} language={config.language} theme={prismTheme}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={`${className} overflow-x-auto p-4 font-mono text-sm`}
              style={{ ...style, backgroundColor: "transparent" }}
            >
              {tokens.map((line, lineIndex) => (
                <div key={lineIndex} {...getLineProps({ line })}>
                  {line.map((token, tokenIndex) => (
                    <span key={tokenIndex} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </ScrollArea>
    </div>
  )
}
