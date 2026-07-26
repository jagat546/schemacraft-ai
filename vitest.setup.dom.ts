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

// jsdom has no window.matchMedia implementation at all -- confirmed
// directly: the first test in this suite to mount a full OutputTabs with a
// mermaidDiagram present (SplitPaneCanvas -> useIsMobile() ->
// window.matchMedia) threw "window.matchMedia is not a function" until
// this was added. A minimal stub is enough for useIsMobile's actual usage
// (addEventListener/removeEventListener on the returned MediaQueryList;
// nothing reads `matches` in a way that needs to reflect a real viewport).
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// jsdom also has no ResizeObserver -- react-resizable-panels (used by
// SplitPaneCanvas, which OutputTabs renders whenever a mermaidDiagram is
// present) reads it during mount and throws ("n is not a constructor")
// without this. A no-op stub is sufficient: nothing in these tests depends
// on an actual resize callback firing.
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom also has no Web Animations API -- Base UI's ScrollArea (used by
// OutputViewerFrame for every viewer except CodeViewer/Monaco, which opts
// out of it) calls element.getAnimations() from an internal timeout, which
// only actually fires in tests that advance fake timers far enough to
// trigger it (confirmed: this surfaced specifically once a test advanced
// timers past a scroll-area timeout, not at initial mount).
if (typeof Element !== "undefined" && !Element.prototype.getAnimations) {
  Element.prototype.getAnimations = () => []
}
