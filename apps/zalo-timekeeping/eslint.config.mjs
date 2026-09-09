import tseslint from "typescript-eslint";

// Same minimal flat config as crm-api-nest: recommended + the repo's merge
// blockers as errors.
export default tseslint.config(
  { ignores: ["www", "node_modules"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  }
);
