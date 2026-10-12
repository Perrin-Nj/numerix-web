// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "storybook-static/**",
    ".vercel/**",
    "next-env.d.ts",
    "src/lib/api/schema.d.ts",
    "src/i18n/generated/**",
    "mock/**",
    "admin/**",
  ]),
  ...storybook.configs["flat/recommended"],
  {
    // Storybook-only policy: screens and features compose components from @/ui and @/game only
    files: ["src/app/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["radix-ui", "@radix-ui/*"],
              message: "Use a component from @/ui or @/game. Raw Radix is only allowed inside src/ui.",
            },
          ],
        },
      ],
    },
  },
  {
    // No silent failures
    rules: { "no-empty": ["error", { allowEmptyCatch: false }] },
  },
]);

export default eslintConfig;
