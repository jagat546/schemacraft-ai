import { Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { PromptSuggestions } from "@/features/ai-workspace/components/prompt-suggestions"
import { TemplatePicker } from "@/features/ai-workspace/components/template-picker"

// Matches lib/actions/generate-schema.ts's own zod cap (TD-013): the
// textarea's own maxLength keeps a prompt from ever reaching that server
// rejection in the first place, and the counter gives feedback well
// before the limit, not just at submission time.
const PROMPT_MAX_LENGTH = 4000

export function PromptEditor({
  value,
  onChange,
  onGenerate,
  isGenerating,
}: {
  value: string
  onChange: (value: string) => void
  onGenerate: () => void
  isGenerating: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      <Textarea
        placeholder="Describe the data you want, e.g. 'a blog with posts and authors'"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        maxLength={PROMPT_MAX_LENGTH}
      />
      {value.length === 0 ? <PromptSuggestions onSelect={onChange} /> : null}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {value.length} / {PROMPT_MAX_LENGTH}
          </span>
          <TemplatePicker onSelect={onChange} />
        </div>
        <Button onClick={onGenerate} disabled={isGenerating || value.trim().length === 0}>
          {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {isGenerating ? "Generating…" : "Generate"}
        </Button>
      </div>
    </div>
  )
}
