import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function PromptEditor({
  value,
  onChange,
  onGenerate,
}: {
  value: string
  onChange: (value: string) => void
  onGenerate: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <Textarea
        placeholder="Describe the data you want, e.g. 'a blog with posts and authors'"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
      />
      <Button onClick={onGenerate} disabled={value.trim().length === 0} className="self-end">
        <Sparkles />
        Generate
      </Button>
    </div>
  )
}
