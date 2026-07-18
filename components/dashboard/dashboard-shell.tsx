import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SchemaGenerator } from "@/components/dashboard/schema-generator"

export function DashboardShell() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Schema Generator</h1>
        <p className="text-sm text-muted-foreground">
          Describe your data in plain English and get SQL, a Drizzle model, and sample JSON.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <SchemaGenerator />
        </CardContent>
      </Card>
    </div>
  )
}
