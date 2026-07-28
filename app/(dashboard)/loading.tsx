import { Skeleton } from "@/components/ui/skeleton"

// S7-001: Next.js wraps every page under this route group in a Suspense
// boundary using this file as the fallback, so navigating into any
// authenticated route (Dashboard, Generator, Workbench, History,
// Settings) shows immediate feedback instead of a frozen/blank screen
// while its Server Component awaits Supabase data. One shared, generic
// skeleton rather than a per-route one -- every page here uses the same
// "heading + content" shape, and a route-specific skeleton isn't worth
// the duplication for a fallback that's only ever on screen briefly.
export default function DashboardLoading() {
  return (
    <div aria-hidden="true" className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  )
}
