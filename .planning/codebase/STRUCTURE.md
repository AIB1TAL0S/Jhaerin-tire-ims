# Directory Structure

```text
jhaerin-inventory/
├── drizzle/                     # Database migrations
├── src/
│   ├── app.html                 # Main HTML template
│   ├── hooks.server.ts          # Server-side hooks (auth, context)
│   ├── lib/
│   │   ├── components/          # Reusable Svelte components (UI, Modals, Charts)
│   │   ├── schemas/             # Zod validation schemas (auth, product, sales, etc.)
│   │   ├── server/              # Server-only code
│   │   │   ├── auth/            # JWT and authentication logic
│   │   │   ├── controllers/     # Business logic orchestrators
│   │   │   ├── db/              # Drizzle configuration and schema definition
│   │   │   └── models/          # Database interaction layer (CRUD operations)
│   │   └── utils/               # Shared utilities
│   └── routes/                  # SvelteKit application routes
│       ├── (auth)/              # Login, register, password reset pages
│       ├── dashboard/           # Main dashboard view
│       ├── financial/           # Financial reports/views
│       ├── inventory/           # Inventory management pages
│       ├── reports/             # Reporting tools
│       ├── sales/               # Sales tracking
│       ├── settings/            # App configuration/settings
│       ├── stock/               # Stock-in/out management
│       └── users/               # User management
├── static/                      # Static assets (robots.txt, etc.)
├── svelte.config.js             # SvelteKit and adapter configuration
└── vite.config.ts               # Vite and Vitest configuration
```
