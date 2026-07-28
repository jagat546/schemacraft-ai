import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

// Two projects, not one flat config: the existing "node" suite (compilers,
// analyzer, generation service) needs the "react-server" SSR condition so
// `import "server-only"` resolves to its no-op stub instead of throwing —
// see the comment below. Component tests (S4-003) need the opposite: real
// `react-dom/client`, which only resolves under default conditions.
// `ssr.resolve.conditions` is a whole-graph setting with no per-file
// override, so a single config can't satisfy both; `test.projects` scopes
// it per suite instead (confirmed necessary by running the dom project
// under the node project's SSR conditions first: `react-dom/client` failed
// with "not supported in React Server Components").
export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          // Resolves the "@/*" alias declared in tsconfig.json's `paths`.
          // Without it, every test file's `@/...` import fails immediately
          // with "Cannot find package" — confirmed by removing it and
          // re-running.
          //
          // Uses Vite's own native option instead of the
          // `vite-tsconfig-paths` plugin (which this config used
          // originally): identical effect, verified by testing both, but
          // one fewer dependency. This project's installed Vite version
          // (8.1.5, pulled in transitively by vitest ^4.1.10) marks
          // `resolve.tsconfigPaths` `@experimental` in its own bundled type
          // declarations (node_modules/vite/dist/node/index.d.ts) —
          // checked directly against the installed package, not assumed
          // from documentation, since public sources disagreed with each
          // other on whether the experimental tag has been lifted. If a
          // future Vite upgrade changes this option's behavior or removes
          // it, `npm test` will fail loudly (both smoke tests import via
          // "@/"), not silently.
          tsconfigPaths: true,
        },
        // Vitest executes test files through Vite's SSR module runner,
        // which resolves conditional package exports via
        // `ssr.resolve.conditions` (not the top-level `resolve.conditions`,
        // which was tried first and does not affect this). Without it, any
        // test importing a chain that includes
        // lib/services/generation.service.ts (or any other file with
        // `import "server-only"`) fails at module load time:
        // `server-only`'s default export unconditionally throws, and only
        // resolves to its no-op stub under the "react-server" condition —
        // confirmed by removing this block and re-running.
        ssr: {
          resolve: {
            conditions: ["react-server"],
          },
        },
        test: {
          name: "node",
          // Matches Vitest's own current default (verified by omitting
          // this and re-running — behavior was identical). Pinned
          // explicitly anyway: this project's own scope is specifically
          // "a Node test environment," and an implicit default is one
          // Vitest version bump away from silently changing under us.
          environment: "node",
          include: ["**/*.test.ts"],
        },
      },
      {
        resolve: {
          tsconfigPaths: true,
          // @monaco-editor/react's real implementation fetches Monaco's AMD
          // bundle and language workers from a CDN at runtime -- there's no
          // network access in this test environment, and jsdom has no
          // Worker/canvas support for Monaco to run against even if there
          // were. Aliased to a lightweight stub (vitest.mocks) that mirrors
          // the real component's prop surface as inspectable data attributes,
          // so CodeViewer's own logic (language/readOnly/minimap threshold)
          // stays testable without a real editor instance.
          alias: {
            "@monaco-editor/react": fileURLToPath(
              new URL("./vitest.mocks/monaco-editor-react.tsx", import.meta.url)
            ),
          },
        },
        test: {
          name: "dom",
          // Component tests (React Testing Library) need a real DOM and
          // real `react-dom/client` — deliberately outside the "node"
          // project's `ssr.resolve.conditions: ["react-server"]`, which
          // would otherwise resolve `react-dom/client` to its
          // react-server stub and fail every render.
          environment: "jsdom",
          include: ["**/*.test.tsx"],
          // Testing Library doesn't auto-register DOM cleanup for Vitest
          // the way it does for Jest — without this, render() output from
          // one test leaks into the next (confirmed: two false "multiple
          // elements found" failures before this was added).
          setupFiles: ["./vitest.setup.dom.ts"],
        },
      },
    ],
  },
})
