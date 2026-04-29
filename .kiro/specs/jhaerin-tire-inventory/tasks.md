# Tasks

## Phase 1: Project Setup

- [x] 1. Install required dependencies
  - [x] 1.1 Install shadcn-svelte and initialize it with the Red & Black theme configuration
  - [x] 1.2 Install sveltekit-superforms and zod for form handling and validation
  - [x] 1.3 Install layerchart for data visualizations
  - [x] 1.4 Install @supabase/supabase-js and @supabase/ssr for Supabase Auth integration
  - [x] 1.5 Install fast-check as a dev dependency for property-based testing

- [x] 2. Configure environment variables and TypeScript types
  - [x] 2.1 Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to `.env` and `.env.example`
  - [x] 2.2 Update `worker-configuration.d.ts` (via `npm run gen`) to expose new env vars to Cloudflare Workers runtime
  - [x] 2.3 Extend `src/app.d.ts` to add `App.Locals` interface with `user: { userId, email, role } | null`

- [x] 3. Scaffold MVC folder structure
  - [x] 3.1 Create `src/lib/server/models/` directory with placeholder files: `inventory.ts`, `sales.ts`, `stock.ts`, `users.ts`
  - [x] 3.2 Create `src/lib/server/controllers/` directory with placeholder files: `inventory.ts`, `sales.ts`, `auth.ts`
  - [x] 3.3 Create `src/lib/server/auth/jwt.ts` placeholder
  - [x] 3.4 Create `src/lib/schemas/` directory with placeholder schema files
  - [x] 3.5 Create `src/lib/components/modals/` directory
  - [x] 3.6 Create `src/lib/utils/` directory with a `result.ts` helper exporting the `Result<T>` type

## Phase 2: Database & ORM Setup

- [x] 4. Define the complete Drizzle schema
  - [x] 4.1 Replace the placeholder `task` table in `src/lib/server/db/schema.ts` with the full schema: `users`, `deliveryProviders`, `products`, `stockIn`, `stockOut`, `sales`, `notifications`, `activityLogs`, `settings` tables as specified in the design document
  - [x] 4.2 Add all enums: `roleEnum`, `notificationStatusEnum`, `notificationTypeEnum`
  - [x] 4.3 Add all indexes: `products_brand_size_pattern_unique`, `products_brand_idx`, `products_size_idx`, `stock_in_date_idx`, `stock_in_product_idx`, `stock_out_date_idx`, `stock_out_product_idx`, `sales_date_idx`, `sales_product_idx`
  - [x] 4.4 Add all foreign key references: `stockIn.productId → products.id`, `stockOut.productId → products.id`, `sales.productId → products.id`, `notifications.userId → users.id`, `activityLogs.userId → users.id`
  - [x] 4.5 Export all table definitions and inferred TypeScript types from `schema.ts`

- [x] 5. Run and verify database migration
  - [x] 5.1 Run `npm run db:generate` to generate the initial Drizzle migration files
  - [x] 5.2 Run `npm run db:migrate` to apply the migration to Supabase PostgreSQL
  - [x] 5.3 Verify the schema in Supabase dashboard — confirm all tables, indexes, and foreign keys are present

## Phase 3: Authentication

- [x] 6. Implement JWT validation helper (`src/lib/server/auth/jwt.ts`)
  - [x] 6.1 Implement `validateJWT(token: string): Promise<JWTClaims | null>` using `@supabase/supabase-js` to verify the token against Supabase Auth
  - [x] 6.2 Implement `extractRole(payload: JWTPayload): 'Owner' | 'Staff'` to read the role from Supabase user metadata custom claims
  - [x] 6.3 Export the `JWTClaims` interface

- [ ] 7. Implement `hooks.server.ts`
  - [x] 7.1 Create `src/hooks.server.ts` that intercepts every request using `handle`
  - [x] 7.2 Initialize a Supabase SSR client per request using `@supabase/ssr` `createServerClient`
  - [x] 7.3 Call `supabase.auth.getSession()` to validate and auto-refresh the JWT
  - [x] 7.4 On valid session: extract `userId`, `email`, and `role` from the JWT and attach to `event.locals.user`
  - [x] 7.5 On missing or invalid session: set `event.locals.user = null`
  - [x] 7.6 Add route guard: redirect to `/login` with 401 if `event.locals.user` is null and the route is not `/(auth)/*`
  - [x] 7.7 Add role guard: return 403 if `event.locals.user.role !== 'Owner'` for routes matching `/users/*`, `/reports/*`, `/settings/*`, and `/financial/*`

- [x] 8. Implement Superforms login schema (`src/lib/schemas/auth.ts`)
  - [x] 8.1 Define `loginSchema` with `email: z.string().email()` and `password: z.string().min(1)`
  - [x] 8.2 Define `registerSchema` with `email: z.string().email()`, `password: z.string().min(8)`, and `role: z.enum(['Owner', 'Staff'])`
  - [x] 8.3 Define `passwordResetSchema` with `email: z.string().email()`

- [x] 9. Implement login page (`src/routes/(auth)/login/`)
  - [x] 9.1 Create `+page.server.ts` with a `load` function that redirects authenticated users to `/dashboard` and a `login` form action using Superforms
  - [x] 9.2 In the `login` action: validate form with `loginSchema`, call `supabase.auth.signInWithPassword()`, handle errors with descriptive messages, redirect to `/dashboard` on success
  - [x] 9.3 Create `+page.svelte` rendering the login form using shadcn-svelte `Card`, `Input`, `Button` components with Superforms binding

- [x] 10. Implement registration page (`src/routes/(auth)/register/`)
  - [x] 10.1 Create `+page.server.ts` with a `register` form action that validates `registerSchema` via Superforms
  - [x] 10.2 In the `register` action: check `event.locals.user.role === 'Owner'` (return 403 otherwise), call `supabase.auth.admin.createUser()` with email, password, and role in `user_metadata`, handle duplicate email errors
  - [x] 10.3 Create `+page.svelte` rendering the registration form with role selector

- [x] 11. Implement password reset flow
  - [x] 11.1 Create `src/routes/(auth)/reset-password/+page.server.ts` with a `requestReset` action that calls `supabase.auth.resetPasswordForEmail()` and always returns a generic confirmation message regardless of whether the email exists
  - [x] 11.2 Create the corresponding `+page.svelte` with the password reset request form

## Phase 4: User Management Module

- [x] 12. Implement user model (`src/lib/server/models/users.ts`)
  - [x] 12.1 Implement `getUsers(filters: UserFilters): Promise<User[]>` with search by name/email and pagination support
  - [x] 12.2 Implement `getUserById(id: string): Promise<User | null>`
  - [x] 12.3 Implement `insertUser(data: NewUser): Promise<User>` using Drizzle insert
  - [x] 12.4 Implement `updateUser(id: string, data: Partial<User>): Promise<User>` using Drizzle update
  - [x] 12.5 Implement `logActivity(userId: string, action: string): Promise<void>` inserting into `activityLogs`
  - [x] 12.6 Implement `getActivityLogs(filters: ActivityLogFilters): Promise<ActivityLog[]>` with pagination and date range filtering

- [x] 13. Implement auth controller (`src/lib/server/controllers/auth.ts`)
  - [x] 13.1 Implement `createStaffAccount(email, password, role): Promise<Result<User>>` — calls Supabase Auth Admin API `createUser`, then `insertUser` in the local `users` table, then `logActivity`
  - [x] 13.2 Implement `updateStaffAccount(userId, updates): Promise<Result<User>>` — calls Supabase Auth Admin API `updateUserById`, then `updateUser` in local table
  - [x] 13.3 Implement `deactivateStaffAccount(userId): Promise<Result<void>>` — calls Supabase Auth Admin API `updateUserById` with `{ ban_duration: 'none' }` to disable login
  - [x] 13.4 Implement `deleteStaffAccount(userId): Promise<Result<void>>` — calls Supabase Auth Admin API `deleteUser`, then removes local `users` record

- [x] 14. Implement users page (`src/routes/users/`)
  - [x] 14.1 Define `userFormSchema` in `src/lib/schemas/users.ts` with email, role, and optional password fields
  - [x] 14.2 Create `+page.server.ts` with `load` function returning paginated user list and activity logs; add form actions: `createUser`, `updateUser`, `deactivateUser`, `deleteUser`
  - [x] 14.3 Create `+page.svelte` with a searchable/filterable data table showing name, email, role, and active status
  - [x] 14.4 Create `src/lib/components/modals/UserFormModal.svelte` — shadcn-svelte `Dialog` wrapping the create/edit Superforms form
  - [x] 14.5 Create `src/lib/components/modals/ConfirmDeactivateModal.svelte` — shadcn-svelte `AlertDialog` for deactivation confirmation
  - [x] 14.6 Create `src/lib/components/modals/ConfirmDeleteModal.svelte` — shadcn-svelte `AlertDialog` for deletion confirmation
  - [x] 14.7 Add paginated activity log section to the users page with user and date range filters

## Phase 5: Inventory Management Module

- [x] 15. Implement inventory model (`src/lib/server/models/inventory.ts`)
  - [x] 15.1 Implement `getProducts(filters: ProductFilters): Promise<Product[]>` with search by brand/size/pattern, filter by delivery provider and stock level, excluding archived products by default
  - [x] 15.2 Implement `getProductById(id: string): Promise<Product | null>`
  - [x] 15.3 Implement `insertProduct(data: NewProduct): Promise<Product>` using Drizzle insert
  - [x] 15.4 Implement `updateProduct(id: string, data: Partial<Product>): Promise<Product>` using Drizzle update
  - [x] 15.5 Implement `archiveProduct(id: string): Promise<void>` setting `isArchived = true`
  - [x] 15.6 Implement `getLowStockProducts(): Promise<Product[]>` returning products where `quantity <= lowStockThreshold`
  - [x] 15.7 Implement `getDeadStockProducts(days: number): Promise<Product[]>` returning products with no `stockOut` or `sales` records within the given number of days

- [x] 16. Implement inventory controller (`src/lib/server/controllers/inventory.ts`)
  - [x] 16.1 Implement `createProduct(data: NewProductInput): Promise<Result<Product>>` — validates uniqueness (brand+size+pattern), calls `insertProduct`, triggers low-stock notification check if initial quantity is at or below threshold
  - [x] 16.2 Implement `updateProduct(id, data): Promise<Result<Product>>` — validates uniqueness if brand/size/pattern changed, calls `updateProduct`, re-evaluates low-stock threshold
  - [x] 16.3 Implement `archiveProduct(id): Promise<Result<void>>` — calls `archiveProduct` model function

- [x] 17. Implement inventory page (`src/routes/inventory/`)
  - [x] 17.1 Define `productSchema` in `src/lib/schemas/product.ts` with all required fields and non-negative number validation
  - [x] 17.2 Create `+page.server.ts` with `load` returning filtered product list; add form actions: `createProduct`, `updateProduct`, `archiveProduct`
  - [x] 17.3 Create `+page.svelte` with a searchable/filterable product table
  - [x] 17.4 Create `src/lib/components/modals/ProductFormModal.svelte` — shadcn-svelte `Dialog` or `Sheet` wrapping the Superforms product form
  - [x] 17.5 Create `src/lib/components/modals/ArchiveProductModal.svelte` — shadcn-svelte `AlertDialog` for archive confirmation

## Phase 6: Stock Transaction Module

- [x] 18. Implement stock model and Stock-In page (`src/lib/server/models/stock.ts` + `src/routes/stock/`)
  - [x] 18.1 Implement `insertStockIn(tx, data): Promise<StockIn>` using Drizzle transactional insert
  - [x] 18.2 Implement `updateStockIn(tx, id, data): Promise<StockIn>` — updates record and recalculates quantity delta
  - [x] 18.3 Implement `deleteStockIn(tx, id): Promise<void>` — deletes record
  - [x] 18.4 Implement `adjustProductQuantity(tx, productId, delta): Promise<void>` — atomically increments or decrements `products.quantity` by `delta`
  - [x] 18.5 Implement `getStockIn(filters): Promise<StockIn[]>` with pagination and date filtering
  - [x] 18.6 Define `stockInSchema` in `src/lib/schemas/stockIn.ts` with `quantity: z.number().int().min(1)`
  - [x] 18.7 Create `src/routes/stock/+page.server.ts` with `load` returning Stock-In and Stock-Out lists; add form actions: `createStockIn`, `updateStockIn`, `deleteStockIn` — each wrapping operations in `db.transaction()`
  - [x] 18.8 Create `src/routes/stock/+page.svelte` with tabbed view for Stock-In and Stock-Out
  - [x] 18.9 Create `src/lib/components/modals/StockInFormModal.svelte` — shadcn-svelte `Dialog` with Superforms

- [x] 19. Implement Stock-Out transactions
  - [x] 19.1 Implement `insertStockOut(tx, data): Promise<StockOut>` — validates `quantity <= product.quantity` before insert, then calls `adjustProductQuantity(tx, productId, -quantity)`
  - [x] 19.2 Implement `updateStockOut(tx, id, data): Promise<StockOut>` — reverses old delta, applies new delta atomically
  - [x] 19.3 Implement `deleteStockOut(tx, id): Promise<void>` — restores quantity atomically
  - [x] 19.4 Implement `getStockOut(filters): Promise<StockOut[]>` with pagination and date filtering
  - [x] 19.5 Define `stockOutSchema` in `src/lib/schemas/stockOut.ts` with `quantity: z.number().int().min(1)` and `reason: z.string().min(1)`
  - [x] 19.6 Add `createStockOut`, `updateStockOut`, `deleteStockOut` form actions to `src/routes/stock/+page.server.ts`
  - [x] 19.7 Create `src/lib/components/modals/StockOutFormModal.svelte` — shadcn-svelte `Dialog` with Superforms

## Phase 7: Sales Management Module

- [x] 20. Implement sales model (`src/lib/server/models/sales.ts`)
  - [x] 20.1 Implement `insertSale(tx, data): Promise<Sale>` using Drizzle transactional insert
  - [x] 20.2 Implement `updateSale(tx, id, data): Promise<Sale>` — updates record and recalculates financials
  - [x] 20.3 Implement `deleteSale(tx, id): Promise<void>` — deletes record
  - [x] 20.4 Implement `getSales(filters: SaleFilters): Promise<Sale[]>` with search/filter by product, brand, date, and month
  - [x] 20.5 Implement `getSalesSummary(dateRange): Promise<SalesSummary>` aggregating total revenue, cost, and gross profit

- [x] 21. Implement sales controller and page
  - [x] 21.1 Implement `computeSaleFinancials(quantitySold, costPrice, retailPrice): SaleFinancials` as a pure function in `src/lib/server/controllers/sales.ts`
  - [x] 21.2 Implement `createSale(data): Promise<Result<Sale>>` — validates `quantitySold > 0` and `quantitySold <= product.quantity`, calls `computeSaleFinancials`, runs `db.transaction()` to insert sale and decrement product quantity
  - [x] 21.3 Implement `updateSale(id, data): Promise<Result<Sale>>` — recomputes financials, adjusts quantity delta atomically
  - [x] 21.4 Implement `deleteSale(id): Promise<Result<void>>` — restores product quantity atomically
  - [x] 21.5 Define `saleSchema` in `src/lib/schemas/sale.ts` with `quantitySold: z.number().int().min(1)`
  - [x] 21.6 Create `src/routes/sales/+page.server.ts` with `load` and form actions: `createSale`, `updateSale`, `deleteSale`
  - [x] 21.7 Create `src/routes/sales/+page.svelte` with searchable/filterable sales table
  - [x] 21.8 Create `src/lib/components/modals/SaleFormModal.svelte` — shadcn-svelte `Dialog` with Superforms

## Phase 8: Dashboard Module

- [x] 22. Implement dashboard data aggregation
  - [x] 22.1 Add `getDashboardKPIs(dateRange, filters): Promise<DashboardKPIs>` to `src/lib/server/models/sales.ts` — returns total product count, aggregate stock level, Stock-In summary, Stock-Out summary, revenue, and gross profit for the selected range
  - [x] 22.2 Add `getPeakAndLowestSalesMonth(year): Promise<{ peak: Month; lowest: Month }>` to the sales model
  - [x] 22.3 Add `getSalesChartData(granularity, dateRange): Promise<ChartDataPoint[]>` to the sales model for daily/weekly/monthly bar chart data
  - [x] 22.4 Add `getRevenueProfitTrend(dateRange): Promise<TrendDataPoint[]>` to the sales model for line chart data
  - [x] 22.5 Add `getSalesByCategory(dateRange): Promise<CategoryDataPoint[]>` to the sales model for pie/donut chart data

- [x] 23. Implement dashboard page (`src/routes/dashboard/`)
  - [x] 23.1 Create `+page.server.ts` with `load` function calling all dashboard data aggregation functions; support date range, brand, and product query params for filtering
  - [x] 23.2 Create `+page.svelte` with KPI cards: total products, aggregate stock, Stock-In summary, Stock-Out summary, revenue, gross profit, peak/lowest sales month
  - [x] 23.3 Create `src/lib/components/SalesBarChart.svelte` using LayerChart with daily/weekly/monthly toggle
  - [x] 23.4 Create `src/lib/components/RevenueProfitLineChart.svelte` using LayerChart
  - [x] 23.5 Create `src/lib/components/SalesByCategoryPieChart.svelte` using LayerChart
  - [x] 23.6 Add low-stock alerts panel listing products at or below threshold; clicking a product opens a shadcn-svelte `Dialog` with full product detail
  - [x] 23.7 Add dead-stock alerts panel listing products with no movement within the configured dead-stock period
  - [x] 23.8 Add unread notification count badge visible in the navigation header

## Phase 9: Analytics & Reporting Module

- [x] 24. Implement analytics data functions
  - [x] 24.1 Add `getTopSellingProducts(dateRange, limit): Promise<ProductSalesRank[]>` to the sales model
  - [x] 24.2 Add `getLeastSellingProducts(dateRange, limit): Promise<ProductSalesRank[]>` to the sales model
  - [x] 24.3 Add `getInventoryValueReport(): Promise<InventoryValueItem[]>` to the inventory model — computes `quantity × costPrice` per product and total
  - [x] 24.4 Add `getRevenueAndProfitByPeriod(dateRange, granularity): Promise<PeriodSummary[]>` to the sales model

- [x] 25. Implement reports page (`src/routes/reports/`)
  - [x] 25.1 Create `+page.server.ts` with `load` returning all report data; add a `exportPdf` form action that generates a PDF, uploads it to Supabase Storage, and returns a signed download URL
  - [x] 25.2 Create `+page.svelte` with report sections: top-selling, least-selling, inventory value, revenue/profit by period; include date range and filter controls
  - [x] 25.3 Add LayerChart sales trend visualizations for daily/weekly/monthly granularities
  - [x] 25.4 Create `src/lib/components/modals/ReportExportModal.svelte` — shadcn-svelte `Dialog` for PDF export configuration and download link
  - [x] 25.5 Add print action that renders a print-optimized view using CSS `@media print`

## Phase 10: Notifications Module

- [x] 26. Implement notification service and UI
  - [x] 26.1 Add `insertNotification(data: NewNotification): Promise<Notification>` to a new `src/lib/server/models/notifications.ts` model
  - [x] 26.2 Add `getNotifications(userId, filters): Promise<Notification[]>` with status filtering
  - [x] 26.3 Add `markNotificationRead(id): Promise<void>` updating status to `read`
  - [x] 26.4 Add `dismissAllNotifications(userId): Promise<void>` using a single Drizzle batch update to set all user notifications to `dismissed`
  - [x] 26.5 Add `getUnreadCount(userId): Promise<number>` for the dashboard badge
  - [x] 26.6 Integrate low-stock notification trigger into `src/lib/server/controllers/inventory.ts` — after any product save, if `quantity <= lowStockThreshold`, call `insertNotification`
  - [x] 26.7 Create a Supabase Edge Function (or scheduled cron via Supabase) that detects dead-stock products and inserts dead-stock notifications
  - [x] 26.8 Create `src/lib/components/modals/NotificationModal.svelte` — shadcn-svelte `Dialog` showing notification list with mark-read and dismiss-all actions
  - [x] 26.9 Add notification bell icon with unread count badge to the main navigation layout

## Phase 11: Financial Analytics Module

- [x] 27. Implement financial analytics page (`src/routes/financial/` — Owner only)
  - [x] 27.1 Implement `computeProfitMargin(grossProfit, revenue): number` as a pure function in `src/lib/server/controllers/sales.ts`
  - [x] 27.2 Implement `computeInventoryTurnover(cogs, avgInventoryValue): number` as a pure function in `src/lib/server/controllers/sales.ts`
  - [x] 27.3 Add `getMonthlyFinancialSummary(dateRange): Promise<MonthlyFinancialSummary[]>` to the sales model — returns total revenue, cost, gross profit, and profit margin per month
  - [x] 27.4 Add `getSalesForecast(productId, periods): Promise<ForecastPoint[]>` to the sales model — uses linear trend projection from historical sales data
  - [x] 27.5 Create `src/routes/financial/+page.server.ts` with `load` returning financial summaries; guard with `event.locals.user.role === 'Owner'`
  - [x] 27.6 Create `src/routes/financial/+page.svelte` with profit margin per product table, inventory turnover display, monthly financial summary table, and sales forecast section
  - [x] 27.7 Create `src/lib/components/RevenueProfitAnalysisChart.svelte` using LayerChart for revenue vs profit visualization
  - [x] 27.8 Add period filter and date range selection inside a shadcn-svelte `Dialog` modal

## Phase 12: Settings Module

- [x] 28. Implement settings page (`src/routes/settings/` — Owner only)
  - [x] 28.1 Add `getSettings(): Promise<Settings>` and `updateSettings(data: Partial<Settings>): Promise<Settings>` to a new `src/lib/server/models/settings.ts` model
  - [x] 28.2 Add `getDeliveryProviders(): Promise<DeliveryProvider[]>`, `insertDeliveryProvider(name): Promise<DeliveryProvider>`, `updateDeliveryProvider(id, name): Promise<DeliveryProvider>`, and `deleteDeliveryProvider(id): Promise<void>` to the settings model
  - [x] 28.3 In `deleteDeliveryProvider`: check for active `products` or `stockIn` records referencing the provider before deleting; return a descriptive error if references exist
  - [x] 28.4 Define `settingsSchema` and `deliveryProviderSchema` in `src/lib/schemas/settings.ts`
  - [x] 28.5 Create `src/routes/settings/+page.server.ts` with `load` and form actions: `updateSettings`, `createDeliveryProvider`, `updateDeliveryProvider`, `deleteDeliveryProvider`; guard with Owner role check
  - [x] 28.6 Create `src/routes/settings/+page.svelte` with sections for global threshold, dead-stock days, delivery providers, and system preferences (theme, date format, default report range)
  - [x] 28.7 Create `src/lib/components/modals/DeliveryProviderModal.svelte` — shadcn-svelte `Dialog` for add/edit
  - [x] 28.8 Add shadcn-svelte `AlertDialog` for delivery provider deletion confirmation

## Phase 13: Data Management & Final Checks

- [x] 29. Implement data management features
  - [x] 29.1 Add a backup status section to the settings page showing the last Supabase scheduled backup timestamp
  - [x] 29.2 Add a restore action in `src/routes/settings/+page.server.ts` that triggers a Supabase Storage restore operation after Owner confirmation via shadcn-svelte `AlertDialog`; handle restore failure by preserving current state and returning a descriptive error
  - [x] 29.3 Verify all Drizzle schema constraints are applied: NOT NULL on all required fields, unique indexes, foreign key references — run `npm run db:generate` and inspect the generated SQL migration

- [x] 30. Final integration checks and property-based tests
  - [x] 30.1 Write property-based tests for `computeSaleFinancials` and `computeProfitMargin` in `src/lib/server/controllers/sales.spec.ts` using fast-check (minimum 100 iterations each) — validates Properties 1 and 2
  - [x] 30.2 Write property-based tests for the stock quantity guard logic (Stock-Out and Sale quantity > current stock is rejected) — validates Properties 4 and 5
  - [x] 30.3 Write property-based tests for the stock quantity reversibility (add delta then subtract same delta returns to original) — validates Property 3
  - [x] 30.4 Write unit tests for `hooks.server.ts` JWT validation: valid JWT populates locals, missing JWT redirects to login, expired JWT redirects to login, Staff role on Owner route returns 403
  - [x] 30.5 Write unit tests for inventory duplicate detection: same brand+size+pattern combination returns error
  - [x] 30.6 Write unit tests for Zod schema validation: negative prices/quantities rejected, empty required fields rejected
  - [x] 30.7 Run `npm run test` and confirm all tests pass
  - [x] 30.8 Run `npm run check` to confirm no TypeScript errors
  - [x] 30.9 Run `npm run build` to confirm the Cloudflare Workers build succeeds
