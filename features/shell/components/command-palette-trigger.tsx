"use client"

import { SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useUiStore } from "@/lib/stores/ui-store"

export function CommandPaletteTrigger() {
  const setOpen = useUiStore((state) => state.setCommandPaletteOpen)

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2 text-muted-foreground"
      onClick={() => setOpen(true)}
    >
      <SearchIcon className="size-4" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:flex">
        <span>⌘</span>K
      </kbd>
    </Button>
  )
}
