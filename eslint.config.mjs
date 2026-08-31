import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // These files shape raw Supabase join-query results before real
    // generated types exist (lib/supabase/database.types.ts is a permissive
    // placeholder until `npm run db:types` runs against a live project).
    // `any` here is deliberate, not sloppiness -- swap this override for
    // real types once the schema is pushed.
    files: ["lib/db/**/*.ts", "lib/matching/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
