import type { ReactNode } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Empty-States.md's shared pattern: an icon/glyph, one sentence explaining
// why the region is empty, and at most one primary action. The union below
// (href XOR onClick) is what enforces "at most one action" at the type
// level -- there's no second action slot to accidentally fill, and a
// consumer can't pass both a navigation and a handler for the same button.
type EmptyStateAction =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never }

export type EmptyStateProps = {
  icon: ReactNode
  message: string
  action?: EmptyStateAction
  className?: string
}

export function EmptyState({ icon, message, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4 py-12 text-center", className)}>
      <div aria-hidden="true" className="text-text-muted [&_svg]:size-6">
        {icon}
      </div>
      <p className="max-w-sm text-text-secondary text-body">{message}</p>
      {action ? (
        action.href ? (
          <Button nativeButton={false} render={<Link href={action.href} />}>
            {action.label}
          </Button>
        ) : (
          <Button onClick={action.onClick}>{action.label}</Button>
        )
      ) : null}
    </div>
  )
}
