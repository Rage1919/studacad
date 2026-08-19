import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      // The current demo uses remote <img> assets. Issue #28 owns the migration
      // to an approved image optimization strategy.
      "@next/next/no-img-element": "off",
      // Browser-derived demo state is replaced by server state in issues #20
      // and #27. Keep the rest of the React Hooks rules active meanwhile.
      "react-hooks/set-state-in-effect": "off",
      // Issue #27 inventories and repairs every remaining demo navigation.
      "@next/next/no-location-assign-relative-destination": "off"
    }
  },
  globalIgnores([
    ".next/**",
    ".open-next/**",
    "coverage/**",
    "dist/**",
    "out/**",
    "next-env.d.ts"
  ])
]);
