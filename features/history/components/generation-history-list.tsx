import { Code2Icon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { GenerationHistoryItem } from "@/features/history/components/generation-history-item"
import type { Generation } from "@/lib/repositories/generation.repository"

// No "use client": nothing here needs interactivity of its own — mapping
// and the empty-state check are plain rendering. Only GenerationHistoryItem
// (the delete flow) needs to be a Client Component.
export function GenerationHistoryList({
  generations,
  projectId,
}: {
  generations: Generation[]
  projectId: string
}) {
  if (generations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <Code2Icon className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No generations yet</p>
          <p className="text-sm text-muted-foreground">
            Generate a schema for this project to see its history here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {generations.map((generation) => (
        <GenerationHistoryItem key={generation.id} generation={generation} projectId={projectId} />
      ))}
    </div>
  )
}
