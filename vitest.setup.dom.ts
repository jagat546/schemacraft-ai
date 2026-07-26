import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

// Testing Library doesn't auto-detect Vitest's test lifecycle the way it
// does Jest's, so without this, each render() call in a test file leaves
// its DOM tree in document.body for every subsequent test in that file —
// confirmed by two false "multiple elements found" failures before this
// was added.
afterEach(() => {
  cleanup()
})
