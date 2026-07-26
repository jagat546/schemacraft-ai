import { BracesIcon, DatabaseIcon, FileTextIcon, TableIcon, WaypointsIcon } from "lucide-react"

const OUTPUTS = [
  {
    icon: DatabaseIcon,
    title: "SQL Schema",
    description: "CREATE TABLE statements with types, constraints, and foreign keys.",
  },
  {
    icon: TableIcon,
    title: "Drizzle ORM Model",
    description: "A matching Drizzle schema file, typed and ready to import.",
  },
  {
    icon: BracesIcon,
    title: "Sample JSON",
    description: "Realistic dummy data shaped to your schema, for seeding or prototyping.",
  },
  {
    icon: FileTextIcon,
    title: "Documentation",
    description: "A plain-language write-up of every table, column, and relationship.",
  },
  {
    icon: WaypointsIcon,
    title: "ERD Diagram",
    description: "A pannable, zoomable entity-relationship diagram of your schema.",
  },
] as const

export function FeatureShowcase() {
  return (
    <section className="border-t border-border-subtle bg-surface-1/50 py-20">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            One prompt, five outputs
          </h2>
          <p className="mt-2 text-muted-foreground">
            Every generation produces all five together, from the same description.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {OUTPUTS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
              <Icon className="size-5 text-primary" />
              <h3 className="font-medium">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-4 py-2">
            <span className="text-sm font-medium text-muted-foreground">
              Example — from a one-line prompt
            </span>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-sm text-muted-foreground">
            {`"a blog with posts and authors"

CREATE TABLE "authors" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "posts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "author_id" UUID NOT NULL REFERENCES "authors"("id"),
  "title" VARCHAR(255) NOT NULL,
  PRIMARY KEY ("id")
);`}
          </pre>
        </div>
      </div>
    </section>
  )
}
