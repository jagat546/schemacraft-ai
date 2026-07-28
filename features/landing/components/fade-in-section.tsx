"use client"

import type { ReactNode } from "react"

import { useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"

// Design System 2.0 §8: entrance animation, once per element, no re-trigger
// on scroll-back, respecting prefers-reduced-motion. motion-reduce: is a
// stock Tailwind variant, not a new token.
//
// duration-200 (not a bare "duration-base" class): confirmed by inspecting
// Tailwind's own theme.css that --duration-* is not a real theme namespace
// the way --ease-*/--color-*/--text-* are (only --ease-in/out/in-out and
// --default-transition-duration exist) -- a named `duration-base` utility
// class is never generated, unlike `ease-standard`, which does work and is
// used below. 200ms is --duration-base's documented value (Design System
// 2.0 §8), applied via Tailwind's built-in numeric duration scale, which
// needs no theme registration at all.
export function FadeInSection({ children, className }: { children: ReactNode; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-200 ease-standard motion-reduce:transition-none motion-reduce:transform-none",
        inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className
      )}
    >
      {children}
    </div>
  )
}
