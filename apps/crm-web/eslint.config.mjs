import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  eslintConfigPrettier,
  eslintPluginPrettier,
  {
    rules: {
      // Ratcheted from "warn" once the codebase hit zero of each. These are merge
      // blockers in .claude/code-review.md, and a warning does not block — leaving
      // the same rule advisory in crm-api-nest is how a bare `any` shipped on its
      // HTTP serialization boundary. Re-run `bunx eslint .` before demoting any.
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-empty-object-type": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          vars: "all",
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^(_|ignore)",
        },
      ],
    },
  },
  {
    ignores: [".next/", "dist/", "build/"],
  },
];

export default eslintConfig;
