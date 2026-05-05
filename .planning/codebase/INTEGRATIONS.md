# Integrations

## Supabase
- **Role:** Primary authentication provider and potential real-time/BaaS capabilities.
- **Implementation:** Integrated using `@supabase/ssr` to support server-side rendering auth flows in SvelteKit.
- **Location:** Typically configured in `hooks.server.ts` or `src/lib/server/auth/`.

## PostgreSQL (via Drizzle)
- **Role:** Main relational database storing inventory, sales, users, settings, and stock data.
- **Implementation:** Accessed via Drizzle ORM. The schema is defined in `src/lib/server/db/schema.ts`.
- **Migrations:** Managed via `drizzle-kit` (commands: `db:push`, `db:generate`, `db:migrate`).

## Vercel
- **Role:** Hosting and deployment.
- **Implementation:** Configured in `svelte.config.js` using `@sveltejs/adapter-vercel`. Targets `nodejs22.x` runtime.
