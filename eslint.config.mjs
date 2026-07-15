import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// eslint-config-next 15 ships legacy-format configs, so FlatCompat stays until
// the Next 16 upgrade (its flat configs can then be imported directly).
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // `eslint .` (the `next lint` replacement) walks the whole repo; scope it to
    // the Next app. The indexer and docs workspaces have their own lint setups.
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "indexer/**",
      "docs/**",
      "scripts/**",
    ],
  },
];

export default eslintConfig;
