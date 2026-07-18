import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

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
      />
      <Button
        onClick={onGenerate}
        disabled={isGenerating || value.trim().length === 0}
        className="self-end"
      >
        <Sparkles />
        {isGenerating ? "Generating…" : "Generate"}
      </Button>
    </div>
  )
}
