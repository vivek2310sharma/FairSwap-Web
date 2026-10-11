import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Generated artifacts of the isolated Post Ad preview (source stays linted).
    "tools/post-ad-preview/.next/**",
    "tools/post-ad-preview/next-env.d.ts",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Temporary scaffold (if retained after transfer):
    "fairswap-bootstrap-001/**",
    // Playwright output:
    "playwright-report/**",
    "test-results/**",
    "blob-report/**",
    // Vendor libraries
    "scripts/vendor/**",
    // Disposable local scratch & acceptance tooling
    "scratch/**",
  ]),
]);

export default eslintConfig;
