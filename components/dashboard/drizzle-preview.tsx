import { ScrollArea } from "@/components/ui/scroll-area"

export function DrizzlePreview({ drizzle }: { drizzle: string }) {
  return (
    <ScrollArea className="h-[400px] rounded-md border bg-muted/30">
      <pre className="p-4 font-mono text-sm whitespace-pre-wrap">{drizzle}</pre>
    </ScrollArea>
  )
}
