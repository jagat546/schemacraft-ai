import { Skeleton } from "@/components/ui/skeleton"

export function OutputSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      <div className="flex h-8 w-fit gap-1 rounded-lg bg-muted p-[3px]">
        <Skeleton className="h-full w-16 rounded-md" />
        <Skeleton className="h-full w-16 rounded-md" />
        <Skeleton className="h-full w-16 rounded-md" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-md" />
    </div>
  )
}
