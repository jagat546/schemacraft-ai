import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Mechanizes the feature-module dependency graph documented in
  // docs/architecture/frontend-modularization.md (Architecture Review
  // Iteration #1, High Priority 2) — previously enforced only by
  // convention. eslint-plugin-import is already a transitive dependency
  // of eslint-config-next (no new package added); each zone below
  // encodes exactly the edges verified to exist in the codebase, so any
  // new cross-feature import outside this graph fails lint instead of
  // silently landing.
  {
    files: ["features/**/*.ts", "features/**/*.tsx"],
    plugins: { import: importPlugin },
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./features/shell",
              from: "./features",
              except: ["./shell"],
              message:
                "features/shell has no dependencies on other feature modules (see docs/architecture/frontend-modularization.md).",
            },
            {
              target: "./features/workbench",
              from: "./features",
              except: ["./workbench"],
              message:
                "features/workbench is a leaf module with no dependencies on other feature modules (see docs/architecture/frontend-modularization.md).",
            },
            {
              target: "./features/projects",
              from: "./features",
              except: ["./projects"],
              message:
                "features/projects has no dependencies on other feature modules (see docs/architecture/frontend-modularization.md).",
            },
            {
              target: "./features/compiler",
              from: "./features",
              except: ["./compiler", "./workbench"],
              message:
                "features/compiler may only depend on features/workbench (see docs/architecture/frontend-modularization.md).",
            },
            {
              target: "./features/ai-workspace",
              from: "./features",
              except: ["./ai-workspace", "./compiler", "./workbench"],
              message:
                "features/ai-workspace may only depend on features/compiler and features/workbench (see docs/architecture/frontend-modularization.md).",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
