import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "legacy-static/**",
    // Service worker e runtime do Workbox: saída que o next-pwa gera no build
    // (`dest: "public"`). São bundles minificados — lintá-los só gera ruído.
    "public/sw.js",
    "public/workbox-*.js",
    "public/worker-*.js",
    "public/fallback-*.js",
    // Worktrees de ferramentas de agente carregam uma cópia inteira do projeto;
    // sem isso cada erro de lint aparece duas vezes.
    ".claude/**",
  ]),
]);

export default eslintConfig;
