import type { ReactNode } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The fixed Recovery Action vocabulary from Error-Experience.md's own
// "Recovery Actions" table -- every consumer picks one of these kinds,
// never an unlisted one, so the product never grows an inconsistent
// recovery vocabulary one error message at a time.
export type RecoveryActionKind =
  | "retry"
  | "edit-and-resubmit"
  | "undo"
  | "back-to-dashboard"
  | "sign-in-again"
  | "report-issue"

// href XOR onClick, same enforcement approach as EmptyState's action prop --
// a consumer can't wire an action to both a navigation and a handler at once.
export type RecoveryAction = {
  kind: RecoveryActionKind
  label: string
} & ({ href: string; onClick?: never } | { onClick: () => void; href?: never })

export type ErrorStateProps = {
  icon: ReactNode
  message: string
  action?: RecoveryAction
  secondaryAction?: RecoveryAction
  className?: string
}

function ActionButton({
  action,
  variant,
}: {
  action: RecoveryAction
  variant: "default" | "outline"
}) {
  if (action.href) {
    return (
      <Button variant={variant} nativeButton={false} render={<Link href={action.href} />}>
        {action.label}
      </Button>
    )
  }

  return (
    <Button variant={variant} onClick={action.onClick}>
      {action.label}
    </Button>
  )
}

// Error-Experience.md: an error always pairs color with an icon and a
// message, never color alone, and (where one exists) offers a recovery
// action rather than a dead end. role="alert" so screen readers are
// interrupted the moment this mounts -- unlike EmptyState, which is
// informational rather than urgent and carries no live-region role.
export function ErrorState({
  icon,
  message,
  action,
  secondaryAction,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-4 rounded-lg border border-border-subtle bg-surface-2 p-6 text-center shadow-sm",
        className
      )}
    >
      <div aria-hidden="true" className="text-destructive [&_svg]:size-6">
        {icon}
      </div>
      <p className="max-w-sm text-text-secondary text-body">{message}</p>
      {action || secondaryAction ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action ? <ActionButton action={action} variant="default" /> : null}
          {secondaryAction ? <ActionButton action={secondaryAction} variant="outline" /> : null}
        </div>
      ) : null}
    </div>
  )
}
