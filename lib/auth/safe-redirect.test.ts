import { describe, expect, it } from "vitest"

import { getSafeRedirectPath } from "@/lib/auth/safe-redirect"

describe("getSafeRedirectPath", () => {
  it("accepts a plain relative path", () => {
    expect(getSafeRedirectPath("/dashboard/generator")).toBe("/dashboard/generator")
  })

  it("accepts a relative path with a dynamic segment and query string", () => {
    expect(getSafeRedirectPath("/dashboard/projects/abc-123/workbench?generation=xyz")).toBe(
      "/dashboard/projects/abc-123/workbench?generation=xyz"
    )
  })

  it("rejects null, undefined, and empty input", () => {
    expect(getSafeRedirectPath(null)).toBeNull()
    expect(getSafeRedirectPath(undefined)).toBeNull()
    expect(getSafeRedirectPath("")).toBeNull()
  })

  it("rejects a path with no leading slash", () => {
    expect(getSafeRedirectPath("dashboard")).toBeNull()
  })

  it("rejects a protocol-relative URL (//evil.com)", () => {
    expect(getSafeRedirectPath("//evil.com")).toBeNull()
    expect(getSafeRedirectPath("//evil.com/dashboard")).toBeNull()
  })

  it("rejects an absolute URL with a scheme", () => {
    expect(getSafeRedirectPath("https://evil.com")).toBeNull()
    expect(getSafeRedirectPath("javascript:alert(1)")).toBeNull()
  })

  it("rejects backslash-based scheme smuggling", () => {
    expect(getSafeRedirectPath("/\\evil.com")).toBeNull()
    expect(getSafeRedirectPath("/\\/evil.com")).toBeNull()
  })

  it("rejects a same-origin-looking path that still embeds a scheme", () => {
    expect(getSafeRedirectPath("/https://evil.com")).toBeNull()
  })
})
