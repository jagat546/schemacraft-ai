// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { PromptEditor } from "@/features/ai-workspace/components/prompt-editor"
import { PROMPT_SUGGESTIONS } from "@/features/ai-workspace/lib/suggestions"
import { PROMPT_TEMPLATES } from "@/features/ai-workspace/lib/templates"

describe("PromptEditor", () => {
  it("shows suggestions only when the prompt is empty", () => {
    const { rerender } = render(
      <PromptEditor value="" onChange={vi.fn()} onGenerate={vi.fn()} isGenerating={false} />
    )
    expect(screen.getByText(PROMPT_SUGGESTIONS[0].label)).toBeTruthy()

    rerender(
      <PromptEditor value="something" onChange={vi.fn()} onGenerate={vi.fn()} isGenerating={false} />
    )
    expect(screen.queryByText(PROMPT_SUGGESTIONS[0].label)).toBeNull()
  })

  it("clicking a suggestion fills the textarea via onChange without generating", () => {
    const onChange = vi.fn()
    const onGenerate = vi.fn()
    render(<PromptEditor value="" onChange={onChange} onGenerate={onGenerate} isGenerating={false} />)

    fireEvent.click(screen.getByText(PROMPT_SUGGESTIONS[0].label))

    expect(onChange).toHaveBeenCalledWith(PROMPT_SUGGESTIONS[0].prompt)
    expect(onGenerate).not.toHaveBeenCalled()
  })

  it("selecting a template fills the textarea via onChange without generating", () => {
    const onChange = vi.fn()
    const onGenerate = vi.fn()
    render(
      <PromptEditor value="draft text" onChange={onChange} onGenerate={onGenerate} isGenerating={false} />
    )

    fireEvent.click(screen.getByRole("button", { name: /start from a template/i }))
    fireEvent.click(screen.getByText(PROMPT_TEMPLATES[0].name))

    expect(onChange).toHaveBeenCalledWith(PROMPT_TEMPLATES[0].prompt)
    expect(onGenerate).not.toHaveBeenCalled()
  })
})
