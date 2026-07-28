"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { updateAccessibilityPreferenceAction } from "@/lib/actions/account-preferences.actions"
import { cn } from "@/lib/utils"

function setHtmlClass(className: string, active: boolean) {
  document.documentElement.classList.toggle(className, active)
}

// Design System 2.0 §11 baseline plus a per-user override on top of it,
// never a replacement for it (Dashboard-Experience-Specification.md
// §Settings). The class toggle below is what makes the change visible
// immediately in this tab; the root layout applies the same class from a
// cookie on every subsequent page load, before first paint
// (app/layout.tsx).
export function AccessibilitySettings({
  initialReducedMotion,
  initialHighContrast,
}: {
  initialReducedMotion: boolean
  initialHighContrast: boolean
}) {
  const [reducedMotion, setReducedMotion] = useState(initialReducedMotion)
  const [highContrast, setHighContrast] = useState(initialHighContrast)

  function toggleReducedMotion() {
    const next = !reducedMotion
    setReducedMotion(next)
    setHtmlClass("reduced-motion", next)
    void updateAccessibilityPreferenceAction({ reducedMotion: next })
  }

  function toggleHighContrast() {
    const next = !highContrast
    setHighContrast(next)
    setHtmlClass("high-contrast", next)
    void updateAccessibilityPreferenceAction({ highContrast: next })
  }

  function resetToDefaults() {
    // Scoped to this category only, per
    // Dashboard-Experience-Specification.md §Settings -- never a
    // product-wide reset.
    setReducedMotion(false)
    setHighContrast(false)
    setHtmlClass("reduced-motion", false)
    setHtmlClass("high-contrast", false)
    void updateAccessibilityPreferenceAction({ reducedMotion: false, highContrast: false })
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-h3 font-semibold text-text-primary">Accessibility</h3>
        <p className="text-body-sm text-text-secondary">
          Additive overrides on top of this product&apos;s accessibility baseline.
        </p>
      </div>

      <label className="flex items-center justify-between gap-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-body font-medium text-text-primary">Force reduced motion</span>
          <span className="text-body-sm text-text-secondary">
            Disables transitions and animations, even if your system doesn&apos;t request it.
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          aria-checked={reducedMotion}
          checked={reducedMotion}
          onChange={toggleReducedMotion}
          className={cn("size-5 shrink-0 accent-accent-violet")}
        />
      </label>

      <label className="flex items-center justify-between gap-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-body font-medium text-text-primary">High-contrast borders</span>
          <span className="text-body-sm text-text-secondary">
            Uses a stronger border color throughout the app for better visibility.
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          aria-checked={highContrast}
          checked={highContrast}
          onChange={toggleHighContrast}
          className={cn("size-5 shrink-0 accent-accent-violet")}
        />
      </label>

      {reducedMotion || highContrast ? (
        <Button variant="outline" size="sm" onClick={resetToDefaults} className="w-fit">
          Reset to defaults
        </Button>
      ) : null}
    </div>
  )
}
