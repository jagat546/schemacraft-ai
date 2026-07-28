import { PROMPT_SUGGESTIONS } from "@/features/ai-workspace/lib/suggestions"

// Generator-Experience-Specification.md §Prompt Suggestions: shown only
// when the field is empty, fills the textarea on click, never auto-submits
// -- the user still reviews/edits before generating.
export function PromptSuggestions({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROMPT_SUGGESTIONS.map((suggestion) => (
        <button
          key={suggestion.label}
          type="button"
          onClick={() => onSelect(suggestion.prompt)}
          className="rounded-full border border-border-subtle px-3 py-1 text-body-sm text-text-secondary transition-colors hover:border-accent-violet hover:text-accent-violet"
        >
          {suggestion.label}
        </button>
      ))}
    </div>
  )
}
