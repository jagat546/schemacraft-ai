import { LayoutTemplateIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PROMPT_TEMPLATES } from "@/features/ai-workspace/lib/templates"

// Generator-Experience-Specification.md §Templates: a step beyond
// suggestions -- populates the textarea with a longer, structured prompt
// for the user to review and adapt, never auto-submits. Elevation level 3
// via the existing DropdownMenu primitive (already used by ThemeToggle),
// not a bespoke picker.
export function TemplatePicker({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
        <LayoutTemplateIcon />
        Start from a template
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {PROMPT_TEMPLATES.map((template) => (
          <DropdownMenuItem
            key={template.name}
            onClick={() => onSelect(template.prompt)}
            className="flex flex-col items-start gap-0.5 whitespace-normal"
          >
            <span className="text-body font-medium text-text-primary">{template.name}</span>
            <span className="text-body-sm text-text-secondary">{template.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
