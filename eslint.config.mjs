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
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  // Extend Next.js recommended config (includes TypeScript support)
  ...nextCoreWebVitals,
  ...nextTypeScript,

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
      "no-console": ["warn", { allow: ["warn", "error"] }],

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
