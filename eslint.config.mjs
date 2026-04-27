/**
 * ESLint Configuration (Flat Config for ESLint 9+)
 *
 * Security-critical rules enforced:
 * - no-eval: Prevents eval() usage
 * - no-implied-eval: Prevents setTimeout/setInterval with strings
 * - no-new-func: Prevents new Function() constructor
 * - react/no-danger: Warns on dangerouslySetInnerHTML
 *
 * Note: Build-time linting is disabled (next.config.mjs) due to 3,500+
 * non-critical issues. Security rules verified to pass.
 */
import { createRequire } from "module";
import { dirname } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load FlatCompat via CJS to avoid Node 25 ESM resolution issues with @eslint/eslintrc
const { FlatCompat } = require("@eslint/eslintrc");
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  // Extend Next.js recommended config (includes TypeScript support)
  // Using FlatCompat because eslint-config-next 15.x exports legacy format
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Global ignores
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "coverage/**",
      "*.config.js",
      "*.config.mjs",
      "public/sw.js",
      ".claude/**",
      "remotion/**",
      "next-env.d.ts",
    ],
  },

  // Custom rules for security
  {
    rules: {
      // Security-focused rules
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",

      // React security
      "react/no-danger": "warn",

      // General quality
      "no-console": ["error", { allow: ["error"] }],

      // Code-health signal: FIXME implies urgency, ban it.
      // TODO is allowed (legitimate backlog markers documented in task #6 audit).
      // If the audit grows, consider adding a custom rule that requires TODOs
      // to reference an issue (e.g., `// TODO(#123): ...`).
      "no-warning-comments": [
        "warn",
        { terms: ["fixme"], location: "anywhere" },
      ],

      // Enforce explicit types — disallow explicit 'any'
      "@typescript-eslint/no-explicit-any": "error",

      // Allow underscore-prefixed variables to mark intentionally unused vars
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Allow console in test files, scripts, and utility .mjs files
  {
    files: [
      "tests/**",
      "scripts/**",
      "check-*.mjs",
    ],
    rules: {
      "no-console": "off",
    },
  },

  // Relax rules for test files — mocks and test fixtures commonly use `any`
  {
    files: [
      "__tests__/**",
      "tests/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": "off",
      "react/display-name": "off",
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
