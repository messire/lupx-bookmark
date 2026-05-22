import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  // ── Ignored paths ──────────────────────────────────────────────────────
  { ignores: ["dist/**", "node_modules/**"] },

  // ── Base JS ────────────────────────────────────────────────────────────
  js.configs.recommended,

  // ── TypeScript ─────────────────────────────────────────────────────────
  ...tseslint.configs.recommended,

  // ── React Hooks ────────────────────────────────────────────────────────
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // ── Project-level overrides ────────────────────────────────────────────
  {
    rules: {
      // typescript-eslint recommended flags `any` as error; downgrade to warn
      // so noisy Chrome API call-sites can be addressed incrementally.
      "@typescript-eslint/no-explicit-any": "warn",

      // Non-null assertions are used intentionally in several places
      // (Chrome storage results, DOM refs). Keep as warn, not error.
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },
);
