import { beforeEach, describe, expect, it } from "vitest"

import { useGenerationStore } from "@/lib/stores/generation-store"
import type { GeneratedSchema } from "@/types/schema"

const initialState = useGenerationStore.getState()

beforeEach(() => {
  useGenerationStore.setState(initialState, true)
})

const sampleSchema: GeneratedSchema = {
  sql: 'CREATE TABLE "users" ("id" uuid PRIMARY KEY);',
  drizzle: 'export const users = pgTable("users", { id: uuid("id").primaryKey() })',
  json: '{"users":[]}',
}

describe("useGenerationStore", () => {
  it("starts idle with an empty prompt", () => {
    const state = useGenerationStore.getState()

    expect(state.prompt).toBe("")
    expect(state.state).toEqual({ status: "idle" })
  })

  it("setPrompt updates the draft prompt without changing generation status", () => {
    useGenerationStore.getState().setPrompt("a blog with posts and authors")

    const state = useGenerationStore.getState()
    expect(state.prompt).toBe("a blog with posts and authors")
    expect(state.state).toEqual({ status: "idle" })
  })

  it("startGenerating moves status to generating", () => {
    useGenerationStore.getState().startGenerating()

    expect(useGenerationStore.getState().state).toEqual({ status: "generating" })
  })

  it("succeed carries the generated schema and moves status to success", () => {
    useGenerationStore.getState().startGenerating()
    useGenerationStore.getState().succeed(sampleSchema)

    expect(useGenerationStore.getState().state).toEqual({
      status: "success",
      data: sampleSchema,
    })
  })

  it("fail carries the error message and moves status to error", () => {
    useGenerationStore.getState().startGenerating()
    useGenerationStore.getState().fail("The AI service returned an error. Please try again.")

    expect(useGenerationStore.getState().state).toEqual({
      status: "error",
      message: "The AI service returned an error. Please try again.",
    })
  })

  it("reset clears both the prompt and the generation state", () => {
    useGenerationStore.getState().setPrompt("a hospital management system")
    useGenerationStore.getState().succeed(sampleSchema)

    useGenerationStore.getState().reset()

    const state = useGenerationStore.getState()
    expect(state.prompt).toBe("")
    expect(state.state).toEqual({ status: "idle" })
  })
})
