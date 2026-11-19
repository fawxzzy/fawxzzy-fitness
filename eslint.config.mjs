// ESLint flat config (Next 16 removed `next lint`; the old .eslintrc.json extended
// "next/core-web-vitals"). `npm run lint` lints `src`, the only default `next lint` directory
// this repo has.
import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextCoreWebVitals,
  {
    // eslint-config-next 16 ships eslint-plugin-react-hooks 7, whose recommended set adds the
    // React Compiler rules below. They flag 153 existing sites (mostly setState in an effect);
    // fixing them changes component behaviour and is its own task, not part of the Next 16 move.
    // rules-of-hooks and exhaustive-deps stay on, as on Next 15.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/error-boundaries": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
