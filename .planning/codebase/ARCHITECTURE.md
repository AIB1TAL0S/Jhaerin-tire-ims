# Architecture

## High-Level Pattern
The application follows a full-stack serverless architecture using SvelteKit. 

### Client-Side (Frontend)
- **UI Components:** Built with Svelte 5 (Runes) and Shadcn-Svelte components. State is primarily managed via Svelte Runes.
- **Routing:** File-based routing located in `src/routes/`. Subdirectories represent features like `dashboard`, `inventory`, `sales`, `reports`, etc.
- **Data Fetching:** Handled via SvelteKit's `+page.server.ts` `load` functions.

### Server-Side (Backend)
- **Controllers & Models:** Business logic is abstracted into `src/lib/server/controllers/` and `src/lib/server/models/`. This keeps the route handlers (`+page.server.ts` actions/loaders) clean.
- **Authentication:** Middleware-based auth resolution likely implemented in `src/hooks.server.ts`, verifying JWTs or Supabase session tokens before allowing access to protected routes.
- **Validation:** Input from the client is validated server-side using Zod schemas (`src/lib/schemas/`) combined with `superforms`.

### Data Flow
1. Client submits a form via `superforms`.
2. SvelteKit route action intercepts the request.
3. Server validates the data against Zod schemas.
4. Server controller invokes model functions to interact with the database via Drizzle ORM.
5. Server responds with `ActionFailure` or success, which is reflected back in the client UI.
