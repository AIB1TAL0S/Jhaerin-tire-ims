# Testing

## Frameworks
- **Vitest:** Used as the primary testing framework for unit and component tests.
- **Playwright:** Integrated via `@vitest/browser-playwright` for browser-based testing of Svelte components.

## Configuration
The testing setup (defined in `vite.config.ts`) is split into two projects:
1. **Client Project:**
   - Runs in a browser environment using Playwright (Chromium, headless).
   - Targets files matching `src/**/*.svelte.{test,spec}.{js,ts}`.
   - Excludes server-side code (`src/lib/server/**`).
2. **Server Project:**
   - Runs in a Node.js environment.
   - Targets files matching `src/**/*.{test,spec}.{js,ts}` but excludes Svelte component tests.

## Conventions
- Test files should be placed adjacent to the code they are testing using the `.spec.ts` or `.test.ts` extension.
- Examples of tests can be found in `src/lib/vitest-examples/` and for controllers like `src/lib/server/controllers/sales.spec.ts`.
