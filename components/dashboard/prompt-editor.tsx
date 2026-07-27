import { Loader2, Sparkles, Wand2 } from "lucide-react"

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
    <div className="space-y-6">

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-xl font-bold text-violet-900">
          <Wand2 className="h-5 w-5 text-violet-600" />
          Describe your project
        </h3>

        <p className="text-sm text-violet-500">
          Tell SchemaCraft AI what you want to build and it will generate the
          complete SQL schema, Drizzle ORM models, Mermaid ER Diagram and
          sample JSON instantly.
        </p>
      </div>

      <Textarea
        placeholder={`Example:

Build an E-Commerce application.

Requirements:
• Users
• Products
• Categories
• Orders
• Payments
• Reviews

Generate PostgreSQL schema with relationships.`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={12}
        className="
          rounded-2xl
          border-2
          border-violet-200
          bg-violet-50/40
          p-5
          text-base
          shadow-sm
          transition-all
          duration-300
          focus:border-violet-500
          focus:ring-4
          focus:ring-violet-200
        "
      />

      <div className="flex items-center justify-between">

        <div className="text-sm text-violet-500">
          Powered by Gemini AI
        </div>

        <Button
          onClick={onGenerate}
          disabled={isGenerating || value.trim().length === 0}
          size="lg"
          className="
            rounded-xl
            bg-gradient-to-r
            from-violet-600
            to-purple-600
            px-8
            py-6
            text-base
            font-semibold
            text-white
            shadow-lg
            transition-all
            duration-300
            hover:scale-105
            hover:shadow-xl
            hover:from-violet-700
            hover:to-purple-700
          "
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Generate Schema
            </>
          )}
        </Button>

      </div>

    </div>
  )
}