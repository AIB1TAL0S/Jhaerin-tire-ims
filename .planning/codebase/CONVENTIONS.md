# Conventions

## Svelte & Components
- **Svelte 5 Runes:** The project enforces Svelte 5 Runes mode globally (except for `node_modules`). Traditional Svelte reactivity (`let`, `$:` ) should be avoided in favor of `$state`, `$derived`, and `$effect`.
- **UI Library:** We use `shadcn-svelte` combined with TailwindCSS for UI components. Custom components should follow this design system and be placed in `src/lib/components/`.

## Data & Validation
- **Zod Schemas:** All forms, API inputs, and data structures must have corresponding Zod schemas defined in `src/lib/schemas/`.
- **Form Handling:** Forms should be handled using `sveltekit-superforms` for robust client/server validation sync.

## Server-Side
- **Separation of Concerns:** Route handlers (`+page.server.ts`) should not contain raw database queries. Instead, they should delegate to controllers (`src/lib/server/controllers/`), which in turn use models (`src/lib/server/models/`) to interact with Drizzle.
- **Security:** Code that interacts with the database or auth must reside strictly within `src/lib/server/` to ensure it is never bundled with client code.

## Tooling
- **Linting/Formatting:** Code must pass `eslint` and `prettier` checks before committing.
