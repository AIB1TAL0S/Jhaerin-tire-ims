# Requirements Document

## Introduction

The Jhaerin Tire Supply Inventory Management System (JTIMS) is a full-stack web application built with SvelteKit (MVC architecture) that enables Jhaerin Tire Supply to manage tire inventory, track stock movements, record sales, generate financial analytics, and administer user accounts. The system targets two roles — Owner and Staff — with role-based access enforced via Supabase Auth JWT tokens validated on every server request. The application is deployed on Cloudflare Workers using the SvelteKit Cloudflare adapter, with Supabase PostgreSQL as the database accessed through Drizzle ORM.

---

## Glossary

- **JTIMS**: Jhaerin Tire Supply Inventory Management System — the full application described in this document.
- **Owner**: A privileged user role with full access to all modules including User Management and Financial Analytics.
- **Staff**: A standard user role with access to Inventory, Stock, Sales, Dashboard, and Notifications modules.
- **JWT**: JSON Web Token issued by Supabase Auth on successful login, carrying `userId`, `email`, `role`, `exp`, and `iat` claims.
- **Auth_Module**: The authentication and authorization subsystem responsible for login, registration, session management, and RBAC enforcement.
- **User_Manager**: The subsystem responsible for Owner-only CRUD operations on Staff accounts via the Supabase Auth Admin API.
- **Dashboard**: The summary view presenting KPIs, charts, and alerts to authenticated users.
- **Inventory_Manager**: The subsystem responsible for CRUD operations on tire product records.
- **Stock_Manager**: The subsystem responsible for recording and processing Stock-In and Stock-Out transactions.
- **Sales_Manager**: The subsystem responsible for recording sales transactions and computing revenue and profit.
- **Analytics_Engine**: The subsystem responsible for generating reports, visualizations, and data exports.
- **Notification_Service**: The subsystem responsible for generating, storing, and delivering low-stock, dead-stock, and system notifications.
- **Financial_Engine**: The subsystem responsible for profit margin, inventory turnover, and sales forecasting calculations.
- **Settings_Manager**: The subsystem responsible for system-wide configuration including thresholds, delivery providers, and preferences.
- **Data_Manager**: The subsystem responsible for database backups, restores, and data integrity enforcement.
- **Product**: A tire product record containing brand, size, pattern, quantity, cost price, retail price, delivery provider, and low-stock threshold.
- **Stock-In**: An incoming inventory transaction that increases a Product's quantity.
- **Stock-Out**: An outgoing inventory transaction that decreases a Product's quantity.
- **Sale**: A transaction recording the quantity sold, revenue, cost, and gross profit for a Product.
- **Low Stock Threshold**: A configurable minimum quantity below which a Product triggers a low-stock alert.
- **Dead Stock**: A Product with no Stock-Out or Sale movement for a configurable number of days.
- **Gross Profit**: Revenue minus cost for a given Sale or period.
- **Inventory Turnover Ratio**: Cost of goods sold divided by average inventory value for a given period.
- **Drizzle_Client**: The singleton Drizzle ORM client instance used for all database access.
- **hooks.server.ts**: The SvelteKit server hook file that validates the JWT on every incoming request.
- **Superforms**: The form validation library used for all user-facing forms.
- **LayerChart**: The SvelteKit-native D3-based charting library used for all data visualizations.
- **shadcn-svelte**: The UI component library providing dialogs, sheets, alert dialogs, and other components.

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to log in with my email and password, so that I can securely access the system with my assigned role.

#### Acceptance Criteria

1. WHEN a user submits valid email and password credentials, THE Auth_Module SHALL authenticate the user via Supabase Auth and issue a signed JWT containing `userId`, `email`, `role`, `exp`, and `iat` claims.
2. WHEN a user submits invalid email or password credentials, THE Auth_Module SHALL return a descriptive error message and SHALL NOT issue a JWT.
3. WHEN an authenticated user's JWT has expired, THE Auth_Module SHALL automatically attempt to refresh the session via Supabase Auth session refresh before redirecting to `/login`.
4. WHEN a user requests logout, THE Auth_Module SHALL terminate the Supabase Auth session and invalidate the JWT, then redirect the user to `/login`.
5. THE Auth_Module SHALL render the login form using Superforms with client-side validation before submission.
6. WHEN a password reset is requested for a registered email address, THE Auth_Module SHALL trigger the Supabase Auth password reset email flow.
7. IF a password reset is requested for an unregistered email address, THEN THE Auth_Module SHALL return a generic confirmation message without revealing whether the email exists.

---

### Requirement 2: Account Registration

**User Story:** As an Owner, I want to register new user accounts with assigned roles, so that staff members can access the system with appropriate permissions.

#### Acceptance Criteria

1. WHEN an Owner submits a valid registration form with email, password, and role, THE Auth_Module SHALL create the account via Supabase Auth and store the role as a custom claim in Supabase user metadata.
2. WHEN a registration form is submitted with an email address already in use, THE Auth_Module SHALL return a descriptive duplicate-email error and SHALL NOT create a duplicate account.
3. WHEN a registration form is submitted with a password shorter than 8 characters, THE Auth_Module SHALL return a validation error before submitting to Supabase Auth.
4. THE Auth_Module SHALL render the registration form using Superforms with client-side validation before submission.
5. THE Auth_Module SHALL restrict account registration to the Owner role; Staff users SHALL NOT access the registration endpoint.

---

### Requirement 3: JWT Validation and Route Protection

**User Story:** As a system administrator, I want every server request to be validated against a JWT, so that unauthenticated and unauthorized users cannot access protected resources.

#### Acceptance Criteria

1. WHEN any request reaches a protected route, THE hooks.server.ts SHALL validate the JWT signature and expiration before allowing the request to proceed.
2. IF a request carries a missing or malformed JWT, THEN THE hooks.server.ts SHALL redirect the request to `/login` with an HTTP 401 status.
3. IF a request carries an expired JWT that cannot be refreshed, THEN THE hooks.server.ts SHALL redirect the request to `/login` with an HTTP 401 status.
4. WHEN a JWT is successfully validated, THE hooks.server.ts SHALL extract the `userId`, `email`, and `role` claims and attach them to `event.locals` for downstream use.
5. IF a Staff user requests a route restricted to the Owner role, THEN THE hooks.server.ts SHALL return an HTTP 403 response.
6. THE hooks.server.ts SHALL validate every incoming server request without exception, including API endpoints and form actions.

---

### Requirement 4: User Management

**User Story:** As an Owner, I want to create, edit, deactivate, and delete Staff accounts, so that I can control who has access to the system.

#### Acceptance Criteria

1. THE User_Manager SHALL restrict all user management operations to users whose JWT `role` claim equals `Owner`.
2. WHEN an Owner submits a valid create-staff form, THE User_Manager SHALL create the Staff account via the Supabase Auth Admin API and record the creation in the `activityLogs` table via Drizzle_Client.
3. WHEN an Owner submits a valid edit-staff form, THE User_Manager SHALL update the Staff account's email, role, or metadata via the Supabase Auth Admin API.
4. WHEN an Owner confirms deactivation of a Staff account, THE User_Manager SHALL disable the account via the Supabase Auth Admin API so the Staff user can no longer log in.
5. WHEN an Owner confirms deletion of a Staff account, THE User_Manager SHALL permanently delete the account via the Supabase Auth Admin API and remove associated records.
6. THE User_Manager SHALL display a searchable, filterable list of all user accounts showing name, email, role, and active status.
7. WHEN an Owner searches by name or email, THE User_Manager SHALL return matching accounts within 500ms for datasets up to 10,000 users.
8. THE User_Manager SHALL render create and edit forms inside a shadcn-svelte Dialog modal using Superforms validation.
9. THE User_Manager SHALL render deactivation and deletion confirmations inside a shadcn-svelte AlertDialog modal.
10. THE User_Manager SHALL display a paginated activity log showing user actions with timestamps, filterable by user and date range.

---

### Requirement 5: Dashboard Overview

**User Story:** As a user, I want to see a summary of inventory status, sales performance, and alerts on a single dashboard, so that I can quickly assess the state of the business.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to the dashboard, THE Dashboard SHALL display the total tire product count, current aggregate stock level, Stock-In summary, and Stock-Out summary for the selected date range.
2. THE Dashboard SHALL display a revenue and gross profit overview card for the selected date range.
3. THE Dashboard SHALL display peak and lowest sales month indicators derived from the `sales` table.
4. THE Dashboard SHALL display a low-stock alerts panel listing all Products whose `quantity` is at or below their `lowStockThreshold`.
5. THE Dashboard SHALL display a dead-stock alerts panel listing all Products with no Stock-Out or Sale movement within the configured dead-stock period.
6. THE Dashboard SHALL render a LayerChart bar chart showing daily, weekly, or monthly sales volume selectable by the user.
7. THE Dashboard SHALL render a LayerChart line chart showing revenue and gross profit trends over the selected date range.
8. THE Dashboard SHALL render a LayerChart pie or donut chart showing sales breakdown by brand and category.
9. WHEN a user applies date range, brand, or product filters, THE Dashboard SHALL refresh all KPI cards and charts to reflect the filtered data within 1 second.
10. WHEN a user clicks a product in the alerts panel, THE Dashboard SHALL open a shadcn-svelte Dialog displaying the product's full detail.

---

### Requirement 6: Inventory Product Management

**User Story:** As a user, I want to create, view, edit, and archive tire products, so that the product catalog accurately reflects available inventory.

#### Acceptance Criteria

1. WHEN a user submits a valid create-product form, THE Inventory_Manager SHALL insert a new Product record into the `products` table via Drizzle_Client with all required fields: brand, size, pattern, quantity, cost price, retail price, delivery provider, and low-stock threshold.
2. WHEN a user submits a create-product form with a brand, size, and pattern combination that already exists in the `products` table, THE Inventory_Manager SHALL return a duplicate-product validation error and SHALL NOT insert a duplicate record.
3. WHEN a user submits a valid edit-product form, THE Inventory_Manager SHALL update the corresponding Product record in the `products` table via Drizzle_Client.
4. WHEN a user confirms archiving a Product, THE Inventory_Manager SHALL mark the Product as archived in the `products` table and exclude it from active inventory views.
5. THE Inventory_Manager SHALL display a searchable list of active Products supporting search by brand, size, and pattern.
6. WHEN a user applies filters for brand, size, pattern, delivery provider, or stock level, THE Inventory_Manager SHALL return matching Products within 500ms for datasets up to 50,000 records.
7. THE Inventory_Manager SHALL render create and edit forms inside a shadcn-svelte Dialog or Sheet modal using Superforms validation.
8. THE Inventory_Manager SHALL render archive confirmations inside a shadcn-svelte AlertDialog modal.
9. THE Inventory_Manager SHALL enforce the brand-size-pattern uniqueness constraint at the Drizzle schema level via a unique index on the `products` table.
10. WHEN a user submits a product form with a negative cost price, retail price, quantity, or low-stock threshold, THE Inventory_Manager SHALL return a validation error via Superforms before submission.

---

### Requirement 7: Stock-In Transaction Management

**User Story:** As a user, I want to record incoming inventory batches, so that product quantities are accurately updated when new stock arrives.

#### Acceptance Criteria

1. WHEN a user submits a valid Stock-In form, THE Stock_Manager SHALL insert a new record into the `stockIn` table and atomically increment the corresponding Product's `quantity` in the `products` table using a Drizzle_Client database transaction.
2. IF a Drizzle_Client database transaction fails during a Stock-In operation, THEN THE Stock_Manager SHALL roll back all changes and return a descriptive error message without modifying any record.
3. WHEN a user submits a valid edit-Stock-In form, THE Stock_Manager SHALL update the `stockIn` record and recalculate the Product's `quantity` atomically via a Drizzle_Client database transaction.
4. WHEN a user confirms deletion of a Stock-In record, THE Stock_Manager SHALL delete the record and atomically decrement the Product's `quantity` via a Drizzle_Client database transaction.
5. THE Stock_Manager SHALL record the delivery provider, date, and quantity for each Stock-In entry.
6. THE Stock_Manager SHALL display a paginated, filterable transaction history of all Stock-In records with timestamps.
7. THE Stock_Manager SHALL render add, edit, and delete operations inside shadcn-svelte modal components using Superforms validation.
8. WHEN a user submits a Stock-In form with a quantity of zero or less, THE Stock_Manager SHALL return a validation error via Superforms before submission.

---

### Requirement 8: Stock-Out Transaction Management

**User Story:** As a user, I want to record outgoing inventory movements, so that product quantities are accurately reduced when stock leaves the warehouse.

#### Acceptance Criteria

1. WHEN a user submits a valid Stock-Out form, THE Stock_Manager SHALL insert a new record into the `stockOut` table and atomically decrement the corresponding Product's `quantity` in the `products` table using a Drizzle_Client database transaction.
2. IF a Stock-Out quantity exceeds the Product's current `quantity`, THEN THE Stock_Manager SHALL return a validation error and SHALL NOT modify any record.
3. IF a Drizzle_Client database transaction fails during a Stock-Out operation, THEN THE Stock_Manager SHALL roll back all changes and return a descriptive error message without modifying any record.
4. WHEN a user submits a valid edit-Stock-Out form, THE Stock_Manager SHALL update the `stockOut` record and recalculate the Product's `quantity` atomically via a Drizzle_Client database transaction.
5. WHEN a user confirms deletion of a Stock-Out record, THE Stock_Manager SHALL delete the record and atomically restore the Product's `quantity` via a Drizzle_Client database transaction.
6. THE Stock_Manager SHALL record the reason, date, and quantity for each Stock-Out entry.
7. THE Stock_Manager SHALL display a paginated transaction history log of all Stock-Out records with timestamps.
8. THE Stock_Manager SHALL render add, edit, and delete operations inside shadcn-svelte modal components using Superforms validation.

---

### Requirement 9: Sales Transaction Management

**User Story:** As a user, I want to record sales transactions with automatic profit calculation, so that revenue and profitability are tracked accurately.

#### Acceptance Criteria

1. WHEN a user submits a valid create-sale form, THE Sales_Manager SHALL insert a new record into the `sales` table with `quantitySold`, `revenue`, `cost`, and `grossProfit` fields computed by the controller before insertion.
2. THE Sales_Manager SHALL compute `revenue` as `quantitySold × retailPrice`, `cost` as `quantitySold × costPrice`, and `grossProfit` as `revenue − cost` for each Sale record.
3. WHEN a user submits a valid create-sale form, THE Sales_Manager SHALL atomically decrement the corresponding Product's `quantity` in the `products` table using a Drizzle_Client database transaction.
4. IF a sale quantity exceeds the Product's current `quantity`, THEN THE Sales_Manager SHALL return a validation error and SHALL NOT insert a Sale record or modify any Product quantity.
5. IF a Drizzle_Client database transaction fails during a sale creation, THEN THE Sales_Manager SHALL roll back all changes and return a descriptive error message.
6. WHEN a user submits a valid edit-sale form, THE Sales_Manager SHALL update the `sales` record and recompute `revenue`, `cost`, and `grossProfit` atomically.
7. WHEN a user confirms deletion of a Sale record, THE Sales_Manager SHALL delete the record and atomically restore the Product's `quantity` via a Drizzle_Client database transaction.
8. THE Sales_Manager SHALL display a searchable, filterable list of sales transactions supporting search and filter by product, brand, date, and month.
9. THE Sales_Manager SHALL render create, edit, and delete operations inside shadcn-svelte modal components using Superforms validation.
10. WHEN a user submits a sale form with a quantity of zero or less, THE Sales_Manager SHALL return a validation error via Superforms before submission.

---

### Requirement 10: Analytics and Reporting

**User Story:** As an Owner, I want to generate and export inventory and sales reports, so that I can make informed business decisions.

#### Acceptance Criteria

1. THE Analytics_Engine SHALL generate a top-selling products report ranking Products by total `quantitySold` for a user-selected time period.
2. THE Analytics_Engine SHALL generate a least-selling products report ranking Products by total `quantitySold` ascending for a user-selected time period.
3. THE Analytics_Engine SHALL render sales trend visualizations using LayerChart for daily, weekly, and monthly time granularities.
4. THE Analytics_Engine SHALL generate an inventory value report computing `quantity × costPrice` for each active Product and summing to a total inventory value.
5. THE Analytics_Engine SHALL generate revenue and profit reports aggregated by day, week, and month for a user-selected date range.
6. WHEN a user requests a PDF export, THE Analytics_Engine SHALL generate a PDF report and store it in Supabase Storage, then provide a download link.
7. WHEN a user requests a print action, THE Analytics_Engine SHALL render a print-optimized view of the current report.
8. THE Analytics_Engine SHALL render report filter configuration and export confirmation inside a shadcn-svelte Dialog modal.
9. WHEN a user applies date range, brand, or product filters to a report, THE Analytics_Engine SHALL recompute and re-render the report within 2 seconds for datasets up to 100,000 records.

---

### Requirement 11: Notification System

**User Story:** As a user, I want to receive alerts for low stock, dead stock, and system events, so that I can take timely action on inventory issues.

#### Acceptance Criteria

1. WHEN a Product's `quantity` reaches or falls below its `lowStockThreshold` during a save operation, THE Notification_Service SHALL insert a low-stock notification record into the `notifications` table via Drizzle_Client.
2. WHEN a scheduled Supabase Edge Function detects a Product with no Stock-Out or Sale movement for the configured dead-stock period, THE Notification_Service SHALL insert a dead-stock notification record into the `notifications` table.
3. THE Notification_Service SHALL insert system notifications for events including backup completion and report readiness.
4. THE Notification_Service SHALL store each notification with a `status` field that transitions between `unread`, `read`, and `dismissed` states.
5. WHEN a user marks a notification as read, THE Notification_Service SHALL update the notification's `status` to `read` in the `notifications` table via Drizzle_Client.
6. WHEN a user dismisses all notifications, THE Notification_Service SHALL update all of the user's notification records to `dismissed` status in a single Drizzle_Client batch operation.
7. THE Notification_Service SHALL render notification detail and dismiss-all actions inside a shadcn-svelte Dialog modal.
8. THE Dashboard SHALL display the count of unread notifications as a badge visible to the authenticated user.

---

### Requirement 12: Financial Analytics

**User Story:** As an Owner, I want to view profit margins, inventory turnover, and sales forecasts, so that I can evaluate financial performance and plan purchasing.

#### Acceptance Criteria

1. THE Financial_Engine SHALL compute the profit margin percentage per Product as `(grossProfit / revenue) × 100` for a user-selected period.
2. THE Financial_Engine SHALL compute the Inventory Turnover Ratio as `cost of goods sold / average inventory value` for a user-selected period.
3. THE Financial_Engine SHALL generate a trend-based sales forecast projecting future sales volume using historical `sales` data for the selected product or category.
4. THE Financial_Engine SHALL generate a monthly financial summary displaying total revenue, total cost, gross profit, and profit margin percentage for each month in the selected range.
5. THE Financial_Engine SHALL render revenue versus profit analysis using a LayerChart visualization.
6. THE Financial_Engine SHALL render period filter and date range selection inside a shadcn-svelte Dialog modal.
7. THE Financial_Engine SHALL restrict all financial analytics views to users whose JWT `role` claim equals `Owner`.

---

### Requirement 13: Settings Management

**User Story:** As an Owner, I want to configure system settings including stock thresholds, delivery providers, and preferences, so that the system behaves according to business rules.

#### Acceptance Criteria

1. WHEN an Owner updates the global low-stock threshold, THE Settings_Manager SHALL persist the new value and apply it as the default `lowStockThreshold` for Products that do not have a product-specific threshold set.
2. WHEN an Owner updates a product-specific low-stock threshold, THE Settings_Manager SHALL update the `lowStockThreshold` field on the corresponding Product record in the `products` table via Drizzle_Client.
3. WHEN an Owner submits a valid create-delivery-provider form, THE Settings_Manager SHALL insert a new delivery provider record and make it available for selection in product and Stock-In forms.
4. WHEN an Owner submits a valid edit-delivery-provider form, THE Settings_Manager SHALL update the delivery provider record.
5. WHEN an Owner confirms deletion of a delivery provider, THE Settings_Manager SHALL delete the delivery provider record, provided no active Products or Stock-In records reference it.
6. IF a delivery provider deletion is attempted while active Products or Stock-In records reference it, THEN THE Settings_Manager SHALL return a descriptive error and SHALL NOT delete the record.
7. THE Settings_Manager SHALL allow configuration of system preferences including theme, date format, and default report date range.
8. THE Settings_Manager SHALL render delivery provider add, edit, and delete operations inside shadcn-svelte modal components using Superforms validation.
9. THE Settings_Manager SHALL restrict all settings modifications to users whose JWT `role` claim equals `Owner`.

---

### Requirement 14: Data Management and Integrity

**User Story:** As an Owner, I want automated backups and the ability to restore data, so that business data is protected against loss.

#### Acceptance Criteria

1. THE Data_Manager SHALL trigger automatic database backups via Supabase scheduled database dumps on a configurable schedule.
2. WHEN an Owner initiates a backup restore, THE Data_Manager SHALL restore the selected backup from Supabase Storage after the Owner confirms the action in a shadcn-svelte AlertDialog modal.
3. THE Data_Manager SHALL enforce data integrity via Drizzle schema-level constraints including NOT NULL, unique indexes, and foreign key references on all tables.
4. THE Data_Manager SHALL enforce duplicate prevention at both the Drizzle schema level and the Superforms client validation layer for all entity creation forms.
5. THE Data_Manager SHALL manage all schema changes exclusively through Drizzle Kit migrations, with no manual schema modifications applied directly to the database.
6. THE Data_Manager SHALL apply Drizzle indexes on high-frequency query columns including `products.brand`, `products.size`, `sales.date`, `stockIn.date`, and `stockOut.date` to maintain query performance.
7. IF a restore operation fails, THEN THE Data_Manager SHALL abort the restore, preserve the current database state, and return a descriptive error message to the Owner.

---

### Requirement 15: Database Schema

**User Story:** As a developer, I want a well-defined, type-safe database schema, so that all application data is stored consistently and queries are reliable.

#### Acceptance Criteria

1. THE Drizzle_Client SHALL define a `users` table with columns: `id`, `email`, `role`, `createdAt`, and `updatedAt`.
2. THE Drizzle_Client SHALL define a `products` table with columns: `id`, `brand`, `size`, `pattern`, `quantity`, `costPrice`, `retailPrice`, `deliveryProvider`, and `lowStockThreshold`, with a unique index on `(brand, size, pattern)`.
3. THE Drizzle_Client SHALL define a `stockIn` table with columns: `id`, `productId`, `quantity`, `deliveryProvider`, and `date`, with a foreign key reference to `products.id`.
4. THE Drizzle_Client SHALL define a `stockOut` table with columns: `id`, `productId`, `quantity`, `reason`, and `date`, with a foreign key reference to `products.id`.
5. THE Drizzle_Client SHALL define a `sales` table with columns: `id`, `productId`, `quantitySold`, `revenue`, `cost`, `grossProfit`, and `date`, with a foreign key reference to `products.id`.
6. THE Drizzle_Client SHALL define a `notifications` table with columns: `id`, `userId`, `type`, `message`, `status`, and `createdAt`, with a foreign key reference to `users.id`.
7. THE Drizzle_Client SHALL define an `activityLogs` table with columns: `id`, `userId`, `action`, and `createdAt`, with a foreign key reference to `users.id`.
8. THE Drizzle_Client SHALL expose all table definitions and relations through a single `schema.ts` file imported by the singleton `db` instance in `index.ts`.

---

### Requirement 16: MVC Architecture Compliance

**User Story:** As a developer, I want the codebase to follow the defined MVC folder structure, so that concerns are separated and the codebase is maintainable.

#### Acceptance Criteria

1. THE JTIMS SHALL place all Drizzle ORM query functions in `src/lib/server/models/` with one file per domain: `inventory.ts`, `sales.ts`, `stock.ts`, and `users.ts`.
2. THE JTIMS SHALL place all business logic and computed field calculations in `src/lib/server/controllers/` with one file per domain: `inventory.ts`, `sales.ts`, and `auth.ts`.
3. THE JTIMS SHALL place all SvelteKit route files (`+page.svelte`, `+page.server.ts`) in `src/routes/` organized by module: `(auth)/`, `dashboard/`, `inventory/`, `sales/`, `stock/`, `reports/`, `users/`, and `settings/`.
4. THE JTIMS SHALL place all Superforms schema definitions in `src/lib/schemas/`.
5. THE JTIMS SHALL place all reusable shadcn-svelte and custom components in `src/lib/components/`, with modal components in `src/lib/components/modals/`.
6. THE JTIMS SHALL place JWT validation helper functions in `src/lib/server/auth/jwt.ts`.
7. THE JTIMS SHALL expose the singleton Drizzle_Client instance exclusively through `src/lib/server/db/index.ts`; no other file SHALL instantiate a separate database connection.
