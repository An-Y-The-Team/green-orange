import tseslint from "typescript-eslint";

// Minimal flat config — this app is a real Node/TS Turbo citizen, so `turbo run
// lint` runs eslint here (no CI exclusion, unlike the Python crm-api).
export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  }
);
