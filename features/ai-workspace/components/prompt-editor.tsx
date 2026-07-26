import { Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

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
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {value.length} / {PROMPT_MAX_LENGTH}
        </span>
        <Button onClick={onGenerate} disabled={isGenerating || value.trim().length === 0}>
          {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {isGenerating ? "Generating…" : "Generate"}
        </Button>
      </div>
    </div>
  )
}
