import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// tailwind-merge has no knowledge of this project's custom Tailwind v4
// `--text-*` type-scale utilities (text-display-lg, text-h1..h3, text-body,
// text-body-sm, text-caption, text-code -- Design System 2.0 §3), so its
// default "any text-{word} is a color" heuristic misclassifies them into
// the same conflict group as real text-color utilities (text-destructive,
// text-text-secondary, ...). Without this, cn("text-destructive
// text-body-sm") silently drops text-destructive -- confirmed directly:
// InlineError's own token-compliance test failed on exactly this before
// the classGroups extension below was added.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-display-lg",
        "text-h1",
        "text-h2",
        "text-h3",
        "text-body",
        "text-body-sm",
        "text-caption",
        "text-code",
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
