import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    // Resolves the "@/*" alias declared in tsconfig.json's `paths`. Without
    // it, every test file's `@/...` import fails immediately with
    // "Cannot find package" — confirmed by removing it and re-running.
    //
    // Uses Vite's own native option instead of the `vite-tsconfig-paths`
    // plugin (which this config used originally): identical effect,
    // verified by testing both, but one fewer dependency. This project's
    // installed Vite version (8.1.5, pulled in transitively by vitest
    // ^4.1.10) marks `resolve.tsconfigPaths` `@experimental` in its own
    // bundled type declarations (node_modules/vite/dist/node/index.d.ts) —
    // checked directly against the installed package, not assumed from
    // documentation, since public sources disagreed with each other on
    // whether the experimental tag has been lifted. If a future Vite
    // upgrade changes this option's behavior or removes it, `npm test`
    // will fail loudly (both smoke tests import via "@/"), not silently.
    tsconfigPaths: true,
  },
  // Vitest executes test files through Vite's SSR module runner, which
  // resolves conditional package exports via `ssr.resolve.conditions` (not
  // the top-level `resolve.conditions`, which was tried first and does not
  // affect this). Without it, any test importing a chain that includes
  // lib/services/generation.service.ts (or any other file with
  // `import "server-only"`) fails at module load time: `server-only`'s
  // default export unconditionally throws, and only resolves to its no-op
  // stub under the "react-server" condition — confirmed by removing this
  // block and re-running.
  ssr: {
    resolve: {
      conditions: ["react-server"],
    },
  },
  test: {
    // Matches Vitest's own current default (verified by omitting this and
    // re-running — behavior was identical). Pinned explicitly anyway: this
    // milestone's own scope is specifically "a Node test environment," and
    // an implicit default is one Vitest version bump away from silently
    // changing under us.
    environment: "node",
  },
})
