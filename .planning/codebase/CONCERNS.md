# Concerns & Open Questions

## Authentication Flow Completeness
- The codebase uses both Supabase SSR and internal JWT mechanisms (seen in `src/lib/server/auth/jwt.ts`). The interplay between Supabase's built-in session management and custom JWTs needs to be carefully monitored to avoid security holes or session desync.

## Database Migrations
- Migration files are stored in `drizzle/`. It's crucial to ensure that database schema changes in `src/lib/server/db/schema.ts` are always followed by `npm run db:generate` and safely applied via `db:migrate` before deploying to Vercel.

## Scaling SvelteKit Server Actions
- Heavy server actions (e.g., bulk stock updates or complex report generation) might hit Vercel's serverless function timeout limits (typically 10-15 seconds on standard plans). Consider moving long-running tasks to background jobs or optimizing database queries.

## UI Performance
- The use of `layerchart` for visualizations and potentially large inventory lists could impact browser performance. Virtualization (e.g., `@sveltejs/svelte-virtual-list` or similar) might be needed for the `inventory` and `sales` tables if datasets grow large.
