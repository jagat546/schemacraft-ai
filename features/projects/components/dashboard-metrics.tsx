// Dashboard-Experience-Specification.md §Metrics: compact, non-clickable,
// real counts only -- no fabricated trend visuals. --text-h2 numerals +
// --text-caption labels, surface-2 cards, per spec.
export function DashboardMetrics({
  totalProjects,
  totalGenerations,
}: {
  totalProjects: number
  totalGenerations: number
}) {
  const metrics = [
    { label: "Projects", value: totalProjects },
    { label: "Generations", value: totalGenerations },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-lg border border-border-subtle bg-surface-2 p-4"
        >
          <p className="text-h2 font-semibold text-text-primary">{metric.value}</p>
          <p className="text-caption text-text-muted uppercase">{metric.label}</p>
        </div>
      ))}
    </div>
  )
}
