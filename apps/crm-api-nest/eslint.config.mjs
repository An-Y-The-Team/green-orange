import tseslint from "typescript-eslint";

// Minimal flat config — this app is a real Node/TS Turbo citizen, so `turbo run
// lint` runs eslint here (no CI exclusion, unlike the Python crm-api).
export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      // .claude/code-review.md lists a bare `any` as a merge blocker, so it is an
      // error here — it was silently "off", which is how one reached the HTTP
      // serialization boundary (see docs/fixes/v2-business-flow/F31).
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Tests hand-roll Prisma doubles: a fake delegate deliberately accepts and
    // returns loosely-typed args so one stub can stand in for many models.
    // Typing those against the generated client would be more fiction than the
    // `any` is, and these files are excluded from tsc (see tsconfig.json).
    files: ["src/**/*.test.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  }
);
