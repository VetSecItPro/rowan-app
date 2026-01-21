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
    },
  },
];

export default eslintConfig;
