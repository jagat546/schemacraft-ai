"use client"

import { CheckCircle2, Code2 } from "lucide-react"
import { useTheme } from "next-themes"
import { Highlight, themes } from "prism-react-renderer"

import { OutputActions } from "@/components/dashboard/output-actions"
import { ScrollArea } from "@/components/ui/scroll-area"
import { OUTPUT_CONFIG } from "@/lib/output-config"
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

  const prismTheme =
    resolvedTheme === "dark" ? themes.vsDark : themes.github

  return (
    <div className="overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-xl">

      {/* Header */}

      <div className="flex items-center justify-between border-b border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-4">

        <div className="flex items-center gap-3">

          <div className="rounded-xl bg-violet-100 p-2">
            <Code2 className="h-5 w-5 text-violet-700" />
          </div>

          <div>

            <h3 className="font-semibold text-violet-900">
              {config.label}
            </h3>

            <p className="text-xs text-violet-500">
              Generated successfully
            </p>

          </div>

        </div>

        <OutputActions
          content={content}
          variant={variant}
        />

      </div>

      {/* Status */}

      <div className="flex items-center gap-2 border-b bg-violet-50 px-6 py-2 text-sm text-violet-700">

        <CheckCircle2 className="h-4 w-4" />

        Ready to Copy • Download • Use

      </div>

      {/* Code */}

      <ScrollArea className="h-[550px]">

        <Highlight
          code={content.trim()}
          language={config.language}
          theme={prismTheme}
        >
          {({
            className,
            style,
            tokens,
            getLineProps,
            getTokenProps,
          }) => (
            <pre
              className={`${className} overflow-x-auto bg-white p-8 text-[14px] leading-7`}
              style={{
                ...style,
                backgroundColor: "#ffffff",
              }}
            >
              {tokens.map((line, lineIndex) => (
                <div
                  key={lineIndex}
                  {...getLineProps({ line })}
                  className="table-row"
                >
                  <span className="mr-6 inline-block w-8 select-none text-right text-violet-300">
                    {lineIndex + 1}
                  </span>

                  <span>
                    {line.map((token, tokenIndex) => (
                      <span
                        key={tokenIndex}
                        {...getTokenProps({ token })}
                      />
                    ))}
                  </span>
                </div>
              ))}
            </pre>
          )}
        </Highlight>

      </ScrollArea>

    </div>
  )
}