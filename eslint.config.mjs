import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    // build output, vendored libraries, and transient agent worktrees
    ignores: ["build/**", "dist/**", "**/*.min.js", "src/lib/**", ".claude/**"]
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node }
  },
  ...tseslint.configs.recommended,
  // Renderer code runs in the browser (Electron renderer process)
  {
    files: ["src/**/*.js"],
    languageOptions: { globals: globals.browser }
  },
  // Preload scripts are CommonJS. Placed after the tseslint preset so this
  // override wins (later flat-config entries take precedence).
  {
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" }
  },
]);
