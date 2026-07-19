import type { OutputLanguage, OutputVariant } from "@/types/ui"

interface OutputConfig {
  label: string
  filename: string
  extension: string
  mimeType: string
  language: OutputLanguage
}

export const OUTPUT_CONFIG: Record<OutputVariant, OutputConfig> = {
  sql: {
    label: "SQL",
    filename: "schema.sql",
    extension: "sql",
    mimeType: "text/plain",
    language: "sql",
  },
  drizzle: {
    label: "Drizzle Model",
    filename: "schema.ts",
    extension: "ts",
    mimeType: "text/plain",
    language: "typescript",
  },
  json: {
    label: "Sample JSON",
    filename: "data.json",
    extension: "json",
    mimeType: "application/json",
    language: "json",
  },
  documentation: {
    label: "Documentation",
    filename: "schema-documentation.md",
    extension: "md",
    mimeType: "text/markdown",
    language: "markdown",
  },
  mermaid: {
    label: "Mermaid Diagram",
    filename: "schema-diagram.mmd",
    extension: "mmd",
    mimeType: "text/plain",
    language: "mermaid",
  },
}
