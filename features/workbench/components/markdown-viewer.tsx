"use client"

import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { OutputViewerFrame } from "@/features/workbench/components/output-viewer-frame"
import { OUTPUT_CONFIG } from "@/features/workbench/lib/output-config"

// react-markdown always passes a `node` prop to component overrides (hast node
// metadata); it must be stripped before spreading the rest onto a DOM element.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function withoutNode<Props extends { node?: unknown }>({ node, ...rest }: Props) {
  return rest
}

export function MarkdownViewer({ content }: { content: string }) {
  const config = OUTPUT_CONFIG.documentation

  return (
    <OutputViewerFrame label={config.label} content={content} variant="documentation">
      <div className="p-4 text-sm leading-relaxed">
        <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: (props) => <h1 className="mt-4 mb-2 text-xl font-semibold first:mt-0" {...withoutNode(props)} />,
              h2: (props) => <h2 className="mt-4 mb-2 text-lg font-semibold first:mt-0" {...withoutNode(props)} />,
              h3: (props) => <h3 className="mt-3 mb-2 text-base font-semibold first:mt-0" {...withoutNode(props)} />,
              p: (props) => <p className="mb-3 last:mb-0" {...withoutNode(props)} />,
              ul: (props) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0" {...withoutNode(props)} />,
              ol: (props) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0" {...withoutNode(props)} />,
              li: (props) => <li {...withoutNode(props)} />,
              blockquote: (props) => (
                <blockquote
                  className="mb-3 border-l-2 border-border pl-3 text-muted-foreground last:mb-0"
                  {...withoutNode(props)}
                />
              ),
              table: (props) => (
                <div className="mb-3 overflow-x-auto last:mb-0">
                  <table className="w-full border-collapse text-sm" {...withoutNode(props)} />
                </div>
              ),
              thead: (props) => <thead className="border-b border-border" {...withoutNode(props)} />,
              th: (props) => <th className="px-2 py-1.5 text-left font-medium" {...withoutNode(props)} />,
              td: (props) => <td className="border-t border-border px-2 py-1.5" {...withoutNode(props)} />,
              pre: (props) => (
                <pre
                  className="mb-3 overflow-x-auto rounded-md border bg-background p-3 font-mono text-xs last:mb-0"
                  {...withoutNode(props)}
                />
              ),
              code: (props) => {
                const { className, children, ...rest } = withoutNode(props)
                // Fenced code blocks get a `language-*` className from remark; plain
                // inline code never does, so this is the standard way react-markdown
                // consumers tell the two apart (there is no `inline` prop as of v8+).
                const isFenced = /language-/.test(className ?? "")
                if (isFenced) {
                  return (
                    <code className={className} {...rest}>
                      {children}
                    </code>
                  )
                }
                return (
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs" {...rest}>
                    {children}
                  </code>
                )
              },
            }}
          >
            {content}
          </Markdown>
      </div>
    </OutputViewerFrame>
  )
}
