// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GenerationStatus } from "@/features/compiler/components/generation-status"
import { useGenerationStore } from "@/lib/stores/generation-store"

const initialState = useGenerationStore.getState()

beforeEach(() => {
  useGenerationStore.setState(initialState, true)
})

describe("GenerationStatus", () => {
  it("renders nothing extra and no Retry action while idle", () => {
    render(<GenerationStatus onRetry={vi.fn()} />)

    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull()
  })

  it("shows a Retry action on failure, wired to the onRetry handler", () => {
    useGenerationStore.getState().startGenerating()
    useGenerationStore.getState().fail("The AI service returned an error. Please try again.")
    const onRetry = vi.fn()

    render(<GenerationStatus onRetry={onRetry} />)

    expect(screen.getByText("The AI service returned an error. Please try again.")).toBeTruthy()
    const retryButton = screen.getByRole("button", { name: "Retry" })
    retryButton.click()

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("still offers Retry after a second consecutive failure (not a dead end)", () => {
    useGenerationStore.getState().startGenerating()
    useGenerationStore.getState().fail("First failure.")
    const onRetry = vi.fn()
    const { rerender } = render(<GenerationStatus onRetry={onRetry} />)

    screen.getByRole("button", { name: "Retry" }).click()
    expect(onRetry).toHaveBeenCalledTimes(1)

    useGenerationStore.getState().startGenerating()
    useGenerationStore.getState().fail("Second failure.")
    rerender(<GenerationStatus onRetry={onRetry} />)

    expect(screen.getByText("Second failure.")).toBeTruthy()
    screen.getByRole("button", { name: "Retry" }).click()
    expect(onRetry).toHaveBeenCalledTimes(2)
  })

  it("does not render a Retry action on session-expired (a different recovery path)", () => {
    useGenerationStore.getState().expireSession()

    render(<GenerationStatus onRetry={vi.fn()} />)

    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull()
    expect(screen.getByRole("button", { name: "Sign in again" })).toBeTruthy()
  })
})
