"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { InlineError } from "@/components/patterns/inline-error"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { confirmPasswordReset, deleteAccountAction, signOutAllSessionsAction } from "@/lib/actions/auth"

// AD-005's recommended mechanism (delete_own_account(), a SECURITY
// DEFINER function scoped to auth.uid()) is now implemented -- see
// deleteAccountAction. Confirming requires typing the account's own email
// or the literal word "delete" (case-insensitive), matching AD-005's own
// UI requirement and Design-System-2.0.md §10's destructive-confirmation
// dialog variant: this is categorically higher-stakes than the 5-second
// undo toast used for generation deletion, since there is no grace period
// and no recovery once confirmed.
export function AccountSettings({ email }: { email: string }) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isSigningOutAll, startSignOutAllTransition] = useTransition()

  const [deleteConfirmationText, setDeleteConfirmationText] = useState("")
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeletingAccount, startDeleteAccountTransition] = useTransition()

  const canConfirmDelete =
    deleteConfirmationText.trim().toLowerCase() === "delete" ||
    deleteConfirmationText.trim().toLowerCase() === email.trim().toLowerCase()

  function handleDeleteAccount() {
    setDeleteError(null)
    startDeleteAccountTransition(async () => {
      const outcome = await deleteAccountAction()
      if (!outcome.ok) {
        setDeleteError(outcome.error)
        toast.error(outcome.error)
      }
    })
  }

  function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }

    startTransition(async () => {
      const outcome = await confirmPasswordReset(password, { redirect: false })
      if (!outcome.ok) {
        setError(outcome.error)
        toast.error(outcome.error)
        return
      }
      setPassword("")
      setConfirmPassword("")
      toast.success("Password updated.")
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-h3 font-semibold text-text-primary">Account</h3>
        <p className="text-body-sm text-text-secondary">{email}</p>
      </div>

      <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="account-new-password" className="text-sm font-medium">
            New password
          </label>
          <Input
            id="account-new-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="account-confirm-password" className="text-sm font-medium">
            Confirm new password
          </label>
          <Input
            id="account-confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
        {error ? <InlineError message={error} /> : null}
        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? "Updating…" : "Change password"}
        </Button>
      </form>

      <div className="flex flex-col gap-2 border-t border-border-subtle pt-4">
        <h4 className="text-body font-medium text-text-primary">Sign out everywhere</h4>
        <p className="text-body-sm text-text-secondary">
          Sign out of every device where you&apos;re currently signed in.
        </p>
        <Button
          variant="outline"
          className="w-fit"
          disabled={isSigningOutAll}
          onClick={() => startSignOutAllTransition(() => signOutAllSessionsAction())}
        >
          {isSigningOutAll ? "Signing out…" : "Sign out of all sessions"}
        </Button>
      </div>

      <div className="flex flex-col gap-2 border-t border-border-subtle pt-4">
        <h4 className="text-body font-medium text-destructive">Delete account</h4>
        <p className="text-body-sm text-text-secondary">
          Permanently deletes your account and every project and generation you own. This cannot be
          undone.
        </p>
        <Dialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open)
            if (!open) {
              setDeleteConfirmationText("")
              setDeleteError(null)
            }
          }}
        >
          <DialogTrigger render={<Button variant="destructive" className="w-fit" />}>
            Delete account
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This permanently deletes your account, every project you own, and every generation in
                those projects. There is no grace period and no way to undo this once confirmed.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="delete-account-confirm" className="text-sm font-medium">
                Type <span className="font-semibold">delete</span> or your email ({email}) to confirm
              </label>
              <Input
                id="delete-account-confirm"
                autoComplete="off"
                value={deleteConfirmationText}
                onChange={(event) => setDeleteConfirmationText(event.target.value)}
              />
            </div>
            {deleteError ? <InlineError message={deleteError} /> : null}
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button
                variant="destructive"
                disabled={!canConfirmDelete || isDeletingAccount}
                onClick={handleDeleteAccount}
              >
                {isDeletingAccount ? "Deleting…" : "Delete my account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
