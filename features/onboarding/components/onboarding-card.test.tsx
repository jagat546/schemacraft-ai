// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockPush = vi.fn()
const mockDismissOnboardingAction = vi.fn().mockResolvedValue(undefined)

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock("@/lib/actions/onboarding.actions", () => ({
  dismissOnboardingAction: mockDismissOnboardingAction,
}))

const { OnboardingCard } = await import("@/features/onboarding/components/onboarding-card")
const { useGenerationStore } = await import("@/lib/stores/generation-store")
const { PROMPT_SUGGESTIONS } = await import("@/features/ai-workspace/lib/suggestions")

const initialStoreState = useGenerationStore.getState()

beforeEach(() => {
  useGenerationStore.setState(initialStoreState, true)
  mockPush.mockClear()
  mockDismissOnboardingAction.mockClear()
})

describe("OnboardingCard", () => {
  it("renders example prompts, a Generate CTA, a templates entry point, and a docs link", () => {
    render(<OnboardingCard />)

    expect(screen.getByRole("button", { name: /generate your first schema/i })).toBeTruthy()
    expect(screen.getByRole("button", { name: /browse templates/i })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Documentation" })).toBeTruthy()
    for (const suggestion of PROMPT_SUGGESTIONS) {
      expect(screen.getByRole("button", { name: suggestion.label })).toBeTruthy()
    }
  })

  it("dismissing hides the card immediately and persists the dismissal", () => {
    render(<OnboardingCard />)

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }))

    expect(screen.queryByText("Generate your first schema")).toBeNull()
    expect(mockDismissOnboardingAction).toHaveBeenCalledTimes(1)
  })

  it("clicking an example prompt sets the shared prompt and navigates to the Generator", () => {
    render(<OnboardingCard />)

    const [firstSuggestion] = PROMPT_SUGGESTIONS
    fireEvent.click(screen.getByRole("button", { name: firstSuggestion.label }))

    expect(useGenerationStore.getState().prompt).toBe(firstSuggestion.prompt)
    expect(mockPush).toHaveBeenCalledWith("/dashboard/generator")
  })
})
