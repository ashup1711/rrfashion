# RR Fashion — Complete Codebase & Implementation Document

> **Generated:** 2026-08-02 · **Source of truth:** live repo at `/Users/ashutoshraval/www/rrFashion` (backend + frontend + infra)
> **Scope:** this document describes the **current, on-disk** implementation — tech stacks, architecture, UI design, every feature, roles & permissions, admin dashboard, API surface, data model, security configuration, testing, and deployment.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Tech Stack & Versions](#2-tech-stack--versions)
3. [Project Structure](#3-project-structure)
4. [Runtime Configuration Surface](#4-runtime-configuration-surface)
5. [Backend Architecture (NestJS)](#5-backend-architecture-nestjs)
6. [Database Schema (Prisma / PostgreSQL)](#6-database-schema-prisma--postgresql)
7. [Roles, Permissions & Access Control](#7-roles-permissions--access-control)
8. [Features by Layer](#8-features-by-layer)
9. [Frontend Architecture (React)](#9-frontend-architecture-react)
10. [UI Design System](#10-ui-design-system)
11. [Storefront Pages & Features](#11-storefront-pages--features)
12. [Admin Dashboard & Management Pages](#12-admin-dashboard--management-pages)
13. [API Reference](#13-api-reference)
14. [Key Business Flows](#14-key-business-flows)
15. [Background Jobs, Queues & Scheduling](#15-background-jobs-queues--scheduling)
16. [Security Configuration](#16-security-configuration)
17. [Testing](#17-testing)
18. [Deployment & Infrastructure](#18-deployment--infrastructure)
19. [Known Gaps & Risks](#19-known-gaps--risks)
20. [Appendix: File Index](#20-appendix-file-index)

---

## 1. Executive Summary

RR Fashion is a **full-stack fashion e-commerce platform** for a clothing/rental business (kurtis, gowns, sarees, jewellery) based in **Surat, Gujarat, India**. The product is a monorepo-style repository containing:

| Layer | Technology | Location |
|---|---|---|
| **Backend** | NestJS 10 (TypeScript) REST API + Prisma 5 ORM + PostgreSQL/PostGIS + Redis + BullMQ | `backend/` |
| **Frontend** | React 18 SPA (Vite 6) with Zustand + TanStack Query + Tailwind CSS + PWA | `frontend/` |
| **Database** | PostgreSQL 16 with PostGIS extension (21 migrations, 52 models, 21 enums) | `backend/prisma/` |
| **Payments** | Razorpay (orders, verification, webhooks, refunds, pre-authorization deposits) | `backend/src/modules/payments/` |
| **Infra** | Docker Compose (PostGIS, Redis, MinIO, backend), Kubernetes manifests, GitHub Actions | root `docker-compose.yml`, `k8s/`, `.github/` |

**What the system does:**
- Customer storefront: browse catalog, search/filter, product details with **Sale or Rent** purchase modes, cart, wishlist, guest shopping, checkout with Razorpay/COD, order tracking, invoice PDFs, profile & addresses, OTP-based authentication.
- Admin back-office: full catalog management, orders & fulfillment, inventory with per-unit tracking and 24-hour locks, rentals lifecycle (book → pickup → return → inspect → close, extensions, deposits, late/damage fees), GST invoicing with credit notes, customer service (inquiries, reviews moderation, site reminders), coupons, wallet, analytics dashboard with exports, POS (offline-first), roles & permissions (RBAC), admin users, stores, and conflict resolution.
- **Offline-first POS** using Dexie (IndexedDB) + a sync engine with an outbox pattern, conflict detection, and admin conflict resolution.

---

## 2. Tech Stack & Versions

### 2.1 Backend dependencies (`backend/package.json`)

| Package | Version | Purpose |
|---|---|---|
| `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` | ^10.0.0 | NestJS core framework |
| `@nestjs/config` | ^3.0.0 | Env-driven configuration |
| `@nestjs/jwt` | ^10.2.0 | JWT signing/verification |
| `@nestjs/passport` / `passport` / `passport-jwt` | ^10.0.3 / ^0.7.0 / ^4.0.1 | Authentication strategies |
| `@nestjs/swagger` | ^7.4.2 | OpenAPI docs generation |
| `@nestjs/throttler` | ^5.2.0 | Rate limiting (Redis-backed) |
| `@nestjs/schedule` | ^4.1.2 | Cron scheduling |
| `@nestjs/bullmq` / `bullmq` | ^10.2.3 / ~5.76.0 | Background job queues |
| `@nestjs/websockets` / `@nestjs/platform-socket.io` / `socket.io` | ^10.4.22 / ^10.4.22 / ^4.8.3 | Real-time notifications gateway |
| `@prisma/client` / `prisma` | ^5.0.0 | ORM + migrations |
| `@aws-sdk/client-s3`, `lib-storage`, `s3-request-presigner` | ^3.1076+ | S3/MinIO object storage |
| `ioredis` | ^5.11.1 | Redis client |
| `razorpay` | ^2.9.6 | Payment gateway SDK |
| `helmet` | ^7.2.0 | Security headers |
| `compression` | ^1.8.1 | Response compression |
| `cookie-parser` | ^1.4.7 | Cookie parsing |
| `bcrypt` | ^5.1.1 | Password hashing (12 rounds) |
| `class-validator` / `class-transformer` | ^0.14.0 / ^0.5.1 | DTO validation |
| `isomorphic-dompurify` | ^3.19.0 | HTML sanitization |
| `nodemailer` | ^9.0.3 | Email sending (SMTP) |
| `opossum` | ^8.5.0 | Circuit breaker (Razorpay calls) |
| `pdfkit` | ^0.15.2 | PDF invoice generation |
| `exceljs` | ^4.4.0 | Excel export for reports |
| `prom-client` | ^15.1.3 | Prometheus metrics |
| `sharp` | ^0.35.3 | Image processing/resizing |
| `uuid` | ^14.0.1 | UUID generation |

### 2.2 Frontend dependencies (`frontend/package.json`)

| Package | Version | Purpose |
|---|---|---|
| `react`, `react-dom` | ^18.3.1 | UI framework |
| `vite` | ^6.0.0 | Build tool |
| `react-router-dom` | ^6.28.0 | Client routing (HashRouter) |
| `zustand` | ^5.0.0 | Global state |
| `@tanstack/react-query` | ^5.60.0 | Server state/caching |
| `axios` | ^1.7.7 | HTTP client |
| `tailwindcss` | ^3.4.15 | CSS framework |
| `vite-plugin-pwa` | ^0.21.2 | PWA + Workbox service worker |
| `dexie` | ^4.4.4 | IndexedDB wrapper (POS offline) |
| `framer-motion` | ^12.42.2 | Page/component animations |
| `swiper` | ^14.0.2 | Carousels/sliders |
| `@dnd-kit/core`, `sortable`, `utilities` | ^6.3.1 / ^10.0.0 | Drag-and-drop (image gallery) |
| `react-dropzone` | ^15.0.0 | File drop upload |
| `react-to-print` | ^3.3.0 | Thermal receipt printing (POS) |
| `sonner` | ^2.0.7 | Toast notifications |
| `dompurify` | ^3.4.12 | Client-side sanitization |
| `@types/swiper` | ^5.4.3 | Swiper types |

### 2.3 Runtime environment

- **Node.js 20** (CI, Dockerfiles)
- **PostgreSQL 16 + PostGIS 3.4** (`postgis/postgis:16-3.4`)
- **Redis 7** (`redis:7-alpine`)
- **MinIO** (S3-compatible object storage)

---

## 3. Project Structure

```
rrFashion/
├── backend/                 # NestJS 10 + Prisma 5 REST API (monolith)
│   ├── prisma/
│   │   ├── schema.prisma    # 1375 lines — 52 models, 21 enums, PostGIS
│   │   ├── seed.ts          # 888 lines — permissions, roles, store, brands, products
│   │   └── migrations/      # 20 migration files (see §6.3)
│   ├── src/
│   │   ├── main.ts          # bootstrap: CORS, helmet, Swagger, static, compression
│   │   ├── app.module.ts    # module registry + global guards/providers
│   │   ├── common/          # strategies, guards, middleware, decorators, pipes, filters, interceptors, providers, utils
│   │   ├── config/          # env / database / auth / redis / storage configs + constants
│   │   ├── prisma/          # PrismaService + module
│   │   ├── redis/           # RedisService (ioredis) + RedisModule (global)
│   │   ├── bull/            # BullQueueModule (root connection)
│   │   ├── storage/         # StorageService → S3/MinIO or local (STORAGE_DRIVER)
│   │   ├── health/          # GET /api/health, /api/ready
│   │   ├── metrics/         # prom-client → GET /api/metrics
│   │   ├── uploads/         # Multer upload module
│   │   └── modules/         # 36 feature modules (see §5.4)
│   └── test/                # e2e specs + Testcontainers utils
├── frontend/                # React 18 + Vite 6 SPA (GitHub Pages, HashRouter)
│   ├── src/
│   │   ├── api/             # 33 typed axios endpoint modules
│   │   ├── components/      # common, layout, admin, auth, ui
│   │   ├── hooks/           # 35 custom React Query hooks
│   │   ├── pages/           # 17 customer pages + 24 admin pages + POS
│   │   ├── routes/          # route map (lazy loaded)
│   │   ├── store/           # 7 Zustand stores
│   │   ├── styles/          # globals.css, design tokens
│   │   ├── lib/             # db.ts (Dexie), sync.ts (POS SyncEngine)
│   │   ├── test/            # vitest setup
│   │   ├── types/           # 21 type definition files
│   │   └── utils/           # constants, currency, guest, razorpay loader, etc.
│   ├── vite.config.ts       # PWA + dev proxy /api → :3000
│   └── vitest.config.ts, tailwind.config.js, index.html
├── k8s/                     # namespace, configmap, secrets, deployment, hpa, ingress, cronjob, postgres, redis, minio
├── .github/workflows/       # ci.yml, deploy.yml
├── docs/runbooks/           # payment-failures.md
├── docker-compose.yml       # postgis:16-3.4, redis:7-alpine, minio, backend
├── Dockerfile               # root (multi-stage)
├── package.json             # root orchestration scripts
└── Planning docs: ROOT_CAUSE_ANALYSIS.md, LANDING_PAGE_REVAMP_PLAN.md,
    IMPLEMENTATION_SUMMARY.md, HERO_SECTION_IMPLEMENTATION.md,
    mental_model.txt, requrirnment.txt, session-ses_067b.md
```

---

## 4. Runtime Configuration Surface

All environment variables are documented in `backend/.env.example`. Key groups:

| Group | Variables | Defaults / Notes |
|---|---|---|
| **Database** | `DATABASE_URL` | PostgreSQL connection |
| **Server** | `PORT` | `3000` |
| **JWT** | `JWT_SECRET`, `JWT_ADMIN_SECRET`, `JWT_EXPIRES_IN` (15m), `JWT_ADMIN_EXPIRES_IN` (15m), `REFRESH_EXPIRES_IN` (7d) | Dev fallbacks asserted away in prod (SEC-18) |
| **Password** | `BCRYPT_SALT_ROUNDS` | `12` |
| **OTP** | `AUTH_OTP_HASH_SECRET`, `AUTH_OTP_TTL_MS` | `600000` (10 min) |
| **Rate limits** | `RATE_LIMIT_GENERAL` (120), `RATE_LIMIT_AUTH` (10), `RATE_LIMIT_UPLOAD` (20), `RATE_LIMIT_GUEST` (20) | per-minute |
| **Body limit** | `BODY_LIMIT_JSON` | `1048576` (1 MB) |
| **Swagger** | `SWAGGER_ENABLED` | prod-only gate |
| **CORS** | `CORS_ORIGINS` | comma-separated extra origins |
| **Guest** | `GUEST_SESSION_TTL_DAYS` | `30` |
| **Redis** | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | ioredis + BullMQ |
| **Storage** | `STORAGE_DRIVER` (s3/local), `UPLOAD_DIR`, `MINIO_ENDPOINT/PORT/ACCESS_KEY/SECRET_KEY/BUCKET/USE_SSL` | S3 or local |
| **Mail** | `MAIL_HOST/PORT/USER/PASS/FROM` | SMTP (MailHog-style dev) |
| **Razorpay** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | |
| **Cookies** | `COOKIE_SAMESITE` | strict locally, none behind HTTPS |

---

## 5. Backend Architecture (NestJS)

### 5.1 Bootstrap (`backend/src/main.ts`)

- `NestFactory.create(AppModule, { rawBody: true })` — raw body required for Razorpay HMAC webhook verification.
- `app.setGlobalPrefix('api')` — every route is under `/api`.
- **Middleware order:** `cookieParser()` → `compression({ threshold: 1024 })` (skips `text/event-stream`) → `noStoreMiddleware` → static `/uploads` → CORS → helmet.
- **CORS allow-list** (never `*`): `https://rrfashion.com`, `https://admin.rrfashion.com`, `https://ashup1711.github.io` + dev `localhost:5173`/`localhost:3000`/`127.0.0.1:5173` + `CORS_ORIGINS` env extras; `credentials: true`.
- **Helmet CSP (production):** `defaultSrc 'self'`, `scriptSrc 'self' 'unsafe-inline'` (documented tradeoff for inline loading spinner/Vite preloads), `styleSrc + fonts.googleapis.com`, `fontSrc fonts.gstatic.com + data:`, `imgSrc 'self' data: https: blob:`, `connectSrc 'self' + api.rrfashion.com + rrfashion.com`, `frameSrc 'none'`, `objectSrc 'none'`, `upgradeInsecureRequests`; HSTS 1yr `includeSubDomains preload`; `reportOnly` in dev with `reportUri '/api/csp-report'`.
- Body limit `1mb` (JSON + urlencoded).
- Global pipes: `ValidationPipe({ whitelist, transform, forbidNonWhitelisted, forbidUnknownValues })` → `SanitizePipe()`.
- Global interceptor `TransformInterceptor`; global filter `HttpExceptionFilter`.
- Swagger at `/api/docs` — dev only, or prod when `SWAGGER_ENABLED=true`.
- Serves static `frontend/dist` (HashRouter → no SPA fallback needed).

### 5.2 App module (`backend/src/app.module.ts`)

- `ConfigModule.forRoot({ isGlobal: true, load: [envConfig, databaseConfig, authConfig, redisConfig, storageConfig] })`
- `ScheduleModule.forRoot()` — cron support.
- `PassportModule.register({ defaultStrategy: 'jwt' })`
- **5 named throttlers** (Redis-backed storage): `general` (120/min, skips health+metrics), `auth` (10/min, applies to `/api/auth/*` and `/api/admin/auth/*`), `upload` (20/min), `otp` (300s/5), `guest` (20/min, `/api/guest/*`).
- **Global guards via `APP_GUARD`: `ThrottlerProxyGuard`, `CsrfGuard`** (defense-in-depth, active only for cookie/form posts without Authorization).
- Providers: `JwtStrategy`, `AdminJwtStrategy`, `RedisThrottlerStorage`.
- `configure()` applies `CorrelationIdMiddleware` (uuid → `x-request-id`) to `'*'`.

### 5.3 Authentication & guard stack

**Customer JWT** (`common/strategies/jwt.strategy.ts`):
- Extracts token from `access_token` cookie first, then `Authorization: Bearer`.
- Secret: `auth.jwtSecret` (dev fallback `'rr-fashion-jwt-secret-dev'`).
- `validate()` checks user exists, `isActive`, `deletedAt` → returns `{ id, email, role }`.
- Guest tokens share the customer secret but carry `type: 'guest'` + `ver` claim (matched against `GuestSession.tokenVersion`).

**Admin JWT** (`common/strategies/admin-jwt.strategy.ts`):
- Cookie `admin_access_token` first, then Bearer.
- Secret `auth.jwtAdminSecret`; payload `{ sub, email, roleId, type: 'admin' }`; requires `type === 'admin'`.
- `validate()` loads `AdminUser` + role + rolePermissions → `AuthenticatedAdmin { id, email, name, roleId, role, permissions: string[], storeIds }`.

**Guards** (`common/guards/`):
| Guard | Behavior |
|---|---|
| `JwtAuthGuard` | Passport 'jwt'; honors `@Public()` |
| `AdminJwtAuthGuard` | Passport 'admin-jwt' |
| `OptionalJwtAuthGuard` | Sets user if present, never throws |
| `RolesGuard` | Reads `@Roles('SUPER_ADMIN','ADMIN',...)`; legacy string mapping |
| `PermissionsGuard` | Reads `@Permissions({module, action})`; requires `${module}:${action}` in user permissions |
| `StoreAuthGuard` | Unified customer/guest/admin JWT; `@AllowGuest(true)` → `request.user = null`; guest stale-token rejection; guest session id from `x-guest-session-id` header |
| `ThrottlerProxyGuard` | Uses first IP in `X-Forwarded-For` |
| `OtpThrottlerGuard` | 10/min per phone+IP |
| `CsrfGuard` | Validates `x-csrf-token` ≥8 chars or Origin/Referer for cookie/form posts; skips GET/HEAD/OPTIONS/multipart; `x-csrf-skip: 1` honored |

**Decorators** (`common/decorators/`): `@Public()`, `@Roles(...)`, `@Permissions(...)`, `@CurrentUser('field')`, `@GuestSessionId()`, `@AllowGuest(bool)`, `@SkipTransform()`, Swagger response helpers.

### 5.4 Feature modules (36)

| Module dir | Responsibility |
|---|---|
| `auth` | Customer login, register (with guest merge), refresh rotation, logout, OTP send/verify, getMe, guest-create |
| `admin-auth` | Admin login (bcrypt 12, revokes previous sessions), refresh, getMe, session mgmt |
| `admin-users` | Admin user CRUD + status/deactivate |
| `roles-permissions` | Role CRUD, permission assignment, permission list |
| `users` | Customer management |
| `addresses` | Customer saved addresses |
| `products`, `variants`, `categories`, `brands`, `colors`, `sizes` | Catalog CRUD |
| `stores` | Store locations |
| `inventory` | Per-unit stock, summaries, locks, stock movements, low-stock, audits |
| `orders` | Order lifecycle (create with Razorpay, admin list/detail, status updates, repurchase, returns, tracking, invoice PDF) |
| `payments` | Razorpay create-order/verify/webhook/refund + circuit breaker |
| `rentals` | Rental bookings, availability (GiST overlap), lifecycle, extensions, deposits |
| `reviews` | Product reviews + admin moderation |
| `shipping` | Pincode check, order shipping address, courier receipts |
| `coupons` | Coupon CRUD + apply/validation |
| `inquiries` | Customer inquiries + admin assignment |
| `wishlist` | Customer/guest wishlists + merge |
| `wallet` | Customer wallet balance/transactions/credit/debit |
| `analytics` | Dashboard metrics, revenue chart, top products, exports (queued) |
| `pos` | POS device registration, inventory, orders, sync |
| `cart` | Cart CRUD + guest merge |
| `guest` | Guest sessions (start/refresh), guest cart/address/wishlist/orders |
| `notifications` | Notifications + Socket.IO gateway + mailer |
| `reminders`, `site-reminders` | Site-wide banner reminders |
| `invoices` | GST invoice generation + PDF + credit notes |
| `audit-logs` | Audit trail service (no public controller) |
| `upload`, `images` | Temp uploads, SSE progress, image proxy |
| `admin-orders` | Admin orders controller (separate file pattern) |

---

## 6. Database Schema (Prisma / PostgreSQL)

### 6.1 Overview

- **52 models, 21 enums**, PostgreSQL + **PostGIS** (GiST index on `tstzrange` for rental bookings).
- Connection uses Prisma 5 syntax; `Unsupported("tstzrange")` type used on `RentalBooking.bookingPeriod`.

### 6.2 Models by domain

**Auth & Users**
- `User` — email, passwordHash, phone, role (CUSTOMER/ADMIN), isActive, deletedAt, walletBalance, tokenVersion
- `RefreshToken` — tokenHash (unique), expiresAt, revokedAt (indexed by userId)
- `OtpVerification` — phone, otpHash, purpose, attempts, expiresAt, verifiedAt
- `ProcessedWebhookEvent` — eventId (unique), eventType, handledAt
- `AdminUser` — name, email, passwordHash, roleId, storeIds[] (Postgres string array), isActive, lastLoginAt, deletedAt

**RBAC**
- `RoleModel` (roles) — name (unique), description, isSystem, createdByAdminId
- `Permission` — module, action, description; unique (module, action)
- `RolePermission` — composite key (roleId, permissionId), cascade delete

**Catalog**
- `Category` — self-referencing tree (parent/children), slug, sortOrder, isActive
- `Brand` — name/slug unique, logoUrl, isActive
- `Product` — name, slug, salePrice, rentPricePerDay, compareAtPrice, discountPercent, isSellable, isRentable, isFeatured, isOnSale, stock, sku, tags[], version (cache-busting)
- `ProductVariant` — sku unique, size, color, salePrice, rentPricePerDay, stock, images, inventoryUnits
- `ProductImage` — url, altText, sortOrder, isPrimary, sizeType, variantType
- `ProductTag`, `SizeGuide`, `Review` (rating, title, body, status, helpfulCount, moderationNotes)

**Inventory & Stock**
- `InventoryUnit` — per-unit physical item (variantId, storeId, status, conditionNotes)
- `InventorySummary` — per (variantId, storeId): quantityAvailable/Reserved/Locked/Sold, lowStockThreshold
- `InventoryLock` — lockedByAdminId, deviceId, clientUuid, reason, quantity, orderId, status, lockedAt, expiresAt, releasedAt
- `StockMovement` — quantityChange, type (PURCHASE/SALE/RENTAL_OUT/RENTAL_RETURN/ADJUSTMENT/LOCK/RELEASE/DAMAGE/LOST/RETURN), reference, notes
- `StockAudit` — systemQty, physicalQty, difference, reason, status, conductedBy/approvedBy

**Stores & POS**
- `StoreLocation` — name, address, city, state, gstin, phone, email, isActive
- `PosDevice` — deviceName, deviceUuid (unique), apiKeyHash, isActive, lastSyncedAt, pendingOutboxCount

**Orders & Payments**
- `Order` — orderNumber (unique), userId/guestSessionId, storeId, channel (ONLINE/POS), status, subtotal/discount/shippingFee/tax/total, couponCode, paymentMethod, paymentStatus, isRental, rentalBookingIds[], razorpayOrderId, paymentLinkId/Url, estimatedDeliveryDate, deliveredAt, returnedAt, cancelledAt, posDeviceId
- `OrderItem` — productId, variantId, name, sku, quantity, unitPrice, type (sale/rent), rentStart/rentEnd/days, totalPrice
- `OrderStatusLog` — fromStatus, toStatus, note, changedBy
- `ShippingAddress`, `CourierReceipt` (courierName, trackingNumber, awbNumber)
- `Payment` — razorpayOrderId, razorpayPaymentId, razorpayEventId, razorpayPreAuthId, preAuthStatus, amount, currency, type (SALE/RENT/DEPOSIT/REFUND/WALLET/PAYMENT_LINK/ADJUSTMENT), method, channel, status, offlineReference

**Rentals**
- `RentalBooking` — orderItemId, unitId, storeId, status (BOOKED/PICKED_UP/RETURNED/INSPECTED/CLOSED/CANCELLED/OVERDUE), bookedAt, pickupAt, dueReturnAt, `booking_period tstzrange` (GiST indexed), actualReturnAt, inspectedAt, depositAmount, depositStatus, razorpayPreAuthId, preAuthStatus, lateFee, damageCharge, damageNotes, damagePhotos[], closeNotes
- `RentalExtension` — originalDueDate, newDueDate, additionalCharge, paymentId, approvedBy

**Invoicing (GST)**
- `InvoiceSequence` — (storeId, financialYear) → lastNumber
- `Invoice` — invoiceNumber (unique), type (INVOICE/CREDIT_NOTE), parentInvoiceId (credit-note chain), pdfUrl, pdfStorageKey, taxableValue, cgst, sgst, igst, totalAmount, amountInWords, billingName/Address/Gstin/State, eInvoiceIrn/AckDate/Status

**Engagement & Customer Service**
- `Wishlist` — unique (userId, variantId), notifyOnRestock, notifyOnPriceDrop
- `GuestSession` — expiresAt, lastActivityAt, tokenVersion
- `GuestCartItem`, `GuestWishlistItem`, `GuestAddress`
- `Notification` — type, channel (EMAIL/SMS/PUSH/IN_APP), title, body, dataJson, status
- `Inquiry` — name, email, phone, message, status, assignedAdminId, resolutionNotes
- `Coupon` — code unique, type (PERCENT/FLAT), value, minCartValue, maxDiscount, appliesTo (ALL/SALE/RENT), categoryIds[], brandIds[], usageLimit, usedCount, perUserLimit, validFrom, validUntil
- `CouponUsage` — couponId, userId, orderId, discountGiven
- `WalletTransaction` — userId, amount, type, referenceId/Type, balanceAfter
- `FeatureFlag` — key, isEnabled, configJson
- `ReturnPolicy` — type, windowDays, penaltyPercent, description
- `ReportExport` — reportType, format, parameters, fileUrl, status (PROCESSING/COMPLETED/FAILED)
- `SiteReminder` — title, message, linkUrl, startDate, endDate, isActive
- `Color`, `Size` — catalog attributes

### 6.3 Enums (21)

```prisma
Role { CUSTOMER ADMIN }
OrderStatus { PENDING CONFIRMED PROCESSING SHIPPED DELIVERED CANCELLED COMPLETED RETURN_REQUESTED RETURNED }
PaymentStatus { PENDING PAID FAILED REFUNDED PARTIALLY_REFUNDED }
PaymentType { SALE RENT DEPOSIT REFUND WALLET PAYMENT_LINK ADJUSTMENT }
PaymentChannel { ONLINE OFFLINE }
PaymentMethod { CARD UPI NETBANKING WALLET CASH POS_CARD }
OrderChannel { ONLINE POS }
ReviewStatus { PENDING APPROVED REJECTED HIDDEN }
ImageSizeType { ORIGINAL THUMBNAIL MEDIUM LARGE }
ImageVariantType { ORIGINAL THUMBNAIL MEDIUM LARGE }
InventoryUnitStatus { AVAILABLE RESERVED RENTED MAINTENANCE LOST DAMAGED }
InventoryLockStatus { ACTIVE RELEASED EXPIRED }
ReportStatus { PROCESSING COMPLETED FAILED }
StockMovementType { PURCHASE SALE RENTAL_OUT RENTAL_RETURN ADJUSTMENT LOCK RELEASE DAMAGE LOST RETURN }
RentalBookingStatus { BOOKED PICKED_UP RETURNED INSPECTED CLOSED CANCELLED OVERDUE }
InvoiceType { INVOICE CREDIT_NOTE }
NotificationChannel { EMAIL SMS PUSH IN_APP }
NotificationStatus { PENDING SENT FAILED READ }
InquiryStatus { NEW ASSIGNED IN_PROGRESS RESOLVED CLOSED }
CouponType { PERCENT FLAT }
CouponAppliesTo { ALL SALE RENT }
```

### 6.4 Migration history (20 files)

```
20260630105748_initial_schema
20260630105955_rental_gist_constraint
20260630110107_category_name_unique_removed
20260701000001_restore_booking_period_gist
20260701084634_add_profile_photo_fields
20260701090000_create_invoice_number_function
20260703090000_p0_critical_fixes
20260703100000_add_user_addresses
20260706120000_add_order_status_log
20260707000000_guest_session_tables
20260707100000_add_quantity_locked
20260708120552_add_low_stock_threshold
20260709120000_add_guest_addresses_and_orders
20260709130000_add_product_image_storage_fields
20260723130800_remove_order_item_unique_add_user_product_unique
20260725100000_add_guest_session_indexes_and_image_validation
20260728094538_add_site_reminders
20260730054906_add_colors_model
20260730060233_add_sizes_model
20260731165701_add_guest_session_token_version
```

---

## 7. Roles, Permissions & Access Control

### 7.1 Permission model

The RBAC system is built on three tables: `Permission`, `RoleModel`, `RolePermission` (many-to-many). Permissions use the naming convention **`module:action`**.

**12 modules × 5 actions = 60 permissions**, seeded in `backend/prisma/seed.ts`:

```
Modules: products, orders, customers, inventory, roles, admin_users,
         stores, brands, categories, reviews, reports, settings
Actions: view, create, edit, delete, export
```

### 7.2 System roles (seeded)

| Role | System? | Permissions granted | What they can do |
|---|---|---|---|
| **Super Admin** | ✅ | All **60** permissions | Full system access. Cannot be deleted. Manages roles, admin users, analytics, exports, POS conflicts, wallet, invoices, settings |
| **Store Manager** | ❌ | `products:view/create/edit`, `orders:view/create/edit`, `customers:view`, `inventory:view/create/edit`, `stores:view`, `brands:view/create/edit`, `categories:view/create/edit`, `reviews:view/edit` (19 perms) | Day-to-day store operations: manage catalog, fulfill orders, adjust inventory, moderate reviews |
| **Inventory Staff** | ❌ | `inventory:view/create/edit`, `products:view`, `stores:view` (5 perms) | View products and manage inventory/stock only |

Custom roles can be created and assigned arbitrary permission subsets through the Admin → Roles page.

### 7.3 Default seeded accounts

| Type | Email | Password | Notes |
|---|---|---|---|
| **Admin** | `admin@rrfashion.com` | `Admin@123` | Super Admin role, storeIds = main store |
| **Customer** | sample customer | (seeded) | wallet balance seeded |

### 7.4 Default store

- **RR Fashion — Main Store**, id `00000000-0000-0000-0000-000000000001`
- Shop No. 5, City Market, **Surat, Gujarat**, PIN 395003
- GSTIN `24ABCDE1234F1Z5`
- 6 seeded brands: **FabIndia, Biba, Manyavar, W, Allen Solly, Levi's**

### 7.5 Enforcement points

- **Backend:** `PermissionsGuard` (`@Permissions({module, action})`) and `RolesGuard` (`@Roles('SUPER_ADMIN','ADMIN')`) applied per-controller. Legacy string mapping: `SUPER_ADMIN` → role name `'Super Admin'`; `ADMIN` → `Super Admin | Store Manager | Inventory Staff`.
- **Frontend:** `authStore.hasPermission(module, action)` checks `adminPermissions.includes(\`${module}:${action}\`)`; `AdminLayout` nav sections and route guards gate admin pages.
- **Customer side:** `role` field on `User` (CUSTOMER default, ADMIN possible) with `@Roles` guard on admin-only customer routes.

---

## 8. Features by Layer

### 8.1 Customer storefront features

| Feature | Where | Notes |
|---|---|---|
| Browse catalog with categories/brands/colors/sizes | Home, Shop | Category cards, mega-menu |
| Search with filters (category, price range, on-sale) + sort | Shop | `ProductFilters`, `ProductGrid` |
| Product detail with gallery/zoom, Sale vs Rent toggle | ProductDetail | RENTABLE badge, rent price/day |
| Add to cart (sale or rent with dates) | ProductDetail, Cart | server + optimistic `useCart` |
| Wishlist with restock/price-drop notify + merge | Wishlist | guest-aware |
| Guest shopping + guest checkout | Cart, Checkout | 30-day guest sessions |
| Cart with free-shipping progress bar | Cart | threshold ₹999 |
| Checkout wizard (shipping → payment → review) | Checkout | Razorpay + COD |
| Order history, detail timeline, tracking | Orders, OrderDetail | paginated 10/page |
| Repurchase an old order | Orders | one-click re-order |
| Invoice PDF download | Orders, Invoices | `invoice-{orderId}.pdf` |
| Rentals booking from product page | ProductDetail | rentStart/rentEnd, availability |
| Profile + saved addresses + photo upload | Profile | `POST /api/profile/photo` |
| Compare products | Compare | persisted `compareStore` |
| Contact / FAQ / Shipping & Returns pages | static pages | |
| WhatsApp button, PWA install prompt, exit-intent popup | Layout | engagement |
| Festive promo banners + sale countdown | Home, Sale | rolling 7-day, up to 50% |
| Site reminders banner | Layout | admin-managed |
| OTP-based auth | Auth | SMS OTP |

### 8.2 Admin back-office features

| Feature | Page | Notes |
|---|---|---|
| KPI dashboard + charts | Dashboard | KPIs + charts |
| Analytics day/week/month/year + exports | Analytics | CSV/Excel/PDF via queue |
| Product CRUD + variant editor + image gallery (dnd) | Products, ProductForm | SSE upload progress |
| Category / Brand / Color / Size CRUD | Catalog pages | |
| Inventory summary, locks, low-stock, adjustments, audits | Inventory | 24h locks |
| Order list/detail + status & payment-status updates | Orders, OrderDetail | status log |
| Review moderation | Reviews | approve/reject/hide |
| Rental lifecycle management | Rentals | pickup/return/inspect/close/extend |
| GST invoices + credit notes + PDF | Invoices | |
| Customer wallet credit/debit + stats | Wallet | |
| Coupon CRUD | Coupons | percent/flat, appliesTo |
| Inquiry assignment/resolution | Inquiries | |
| Site reminders | Reminders | banner scheduling |
| Report export queue + downloads | Reports | |
| Role & permission matrix | Roles | `PermissionMatrix` |
| Admin users management | Users | |
| Store locations | Stores | |
| POS conflict resolution | Conflicts | offline sync conflicts |
| Manual job triggers | (admin jobs) | cart-abandonment, guest-cleanup |

### 8.3 POS (offline-first)

- **Dexie IndexedDB** database `rrfashion_pos` v2 with tables: `orders`, `locks`, `products`, `syncQueue`, `conflicts`, `catalog`.
- **SyncEngine** (`lib/sync.ts`) outbox pattern: mutations stored locally with `clientUuid`, synced to `POST /api/pos/sync` with `x-pos-api-key` + `x-pos-device-id`; server applies/dedupes by `clientUuid` and returns conflict records.
- Device registration via `POST /api/pos/register` (device UUID + API key, hashed at rest).
- 80mm thermal receipt printing via `react-to-print`.
- Online/offline/syncing status indicator + pending count + conflict count.
- Admin ConflictList page resolves sync conflicts.

---

## 9. Frontend Architecture (React)

### 9.1 Entry & providers (`frontend/src/main.tsx`)

- `HashRouter` (GitHub Pages compatible; `vite base: '/rrfashion/'`).
- Provider chain: `QueryClientProvider` → `HashRouter` → `AuthInitializer` → `App`; `Toaster` (sonner, richColors, top-right, 4s).
- `purgeLegacyGuestCookies()` on boot; workbox "message channel closed" suppression; window error logging.
- **QueryClient defaults:** `staleTime: 60s`, `retry: 1`, `refetchOnMount: 'always'` (route-change refetch), `refetchOnWindowFocus: true`, `refetchOnReconnect: true`; `QueryCache.onError` toasts only for queries without data.

### 9.2 App shell (`frontend/src/App.tsx`)

- `isAdminRoute = location.pathname.startsWith('/admin')`; admin login → bare layout; admin routes render `AdminLayout` with three-state auth check.
- Customer routes: `Layout` (Header/Footer) + `PageTransition` + `RouteChangeWatcher` (cancels/refetches route-scoped queries).
- `setGlobalNavigator(navigate)` — axios interceptors/stores can SPA-navigate on 401.

### 9.3 API layer

- `api/client.ts` — axios instance, `baseURL` from `localStorage.api_url` → `window.__RUNTIME_ENV__?.API_URL` → `import.meta.env.VITE_API_URL` → `http://localhost:3000/api`; `withCredentials: true`; response interceptor unwraps `{success, data}` envelope; request interceptor attaches guest Bearer from `localStorage.guest_token`; 401 handling (customer → keep 401 for guest flow; admin → `adminLogout()` + SPA-navigate `/admin/login`).
- `api/admin-client.ts` — axios instance for `/api/admin/*`.
- **33 typed endpoint modules** in `api/` (auth, admin-auth, cart, orders, payments, guest, products, etc.) + `client.test.ts`.
- `utils/loadRazorpay.ts` — dynamic script loader with 10s timeout for `checkout.razorpay.com/v1/checkout.js`.
- `utils/constants.ts` — `ROUTES` map, `QUERY_KEYS` map, `CATEGORY_SLUGS`, `STALE_TIMES`, `FREE_SHIPPING_THRESHOLD = 999`, `STANDARD_SHIPPING_FEE = 250`, `FESTIVE_PROMOS` (diwali `SHINE20` 20%, navratri `GARBA15` 15%, wedding `WEDDING10` 10%, holi `HOLI15` 15%).

### 9.4 State management

**Zustand stores (7):**
| Store | State held |
|---|---|
| `authStore` | user, adminUser, adminPermissions, isAuthenticated, isAdminAuthenticated, isAdminAuthValidated, `initializeAuth/initializeAdminAuth` (`/auth/me` + `/admin/auth/me`), logout wipes PWA caches, `hasPermission(module, action)` |
| `adminStore` | admin UI state |
| `cartStore` | itemCount (badge) |
| `compareStore` | persisted comparison list (localStorage) |
| `guestStore` | guest session/token state |
| `uiStore` | UI toggles (drawers, modals) |
| `wishlistStore` | wishlist count/state |

**Server state:** TanStack Query via **35 hooks** in `hooks/` — `useProducts`, `useProduct`, `useCart`, `useWishlist`, `useOrders`, `useMyOrders`, `useAddresses`, `useCategories`, `useBrands`, `useColors`, `useSizes`, `useStores`, `useInventory`, `useRentals`, `useInvoices`, `useAnalytics`, `useWallet`, `useCoupons`, `useInquiries`, `useReminders`, `useReports`, `useRoles`, `useAdminUsers`, `useAdminOrders`, `usePosConflicts`, `useReviews`, `useReviewAdmin`, `useSaleProducts`, `useProfile`, `useProfilePhoto`, `useTempImages`, `useRecentlyViewed`, `useGuestAuth`, `useGuestSession`, `useAuth`, `useAdminAuth`, `useFocusTrap`, `useLandingPageData`.

### 9.5 Routing (`frontend/src/routes/index.tsx`)

All routes lazy-loaded via `retryLazy`; wrapped in `ErrorBoundary` + `Suspense`.

**Customer routes:**
`/`, `/shop`, `/products/:id`, `/cart`, `/checkout` (ProtectedRoute), `/orders` (PR), `/auth/login`, `/auth/register`, `/profile` (PR), `/sale`, `/orders/:id` (PR), `/checkout/guest`, `/wishlist`, `/contact`, `/faq`, `/shipping-returns`, `/compare`, `/pos`

**Admin routes:**
`/admin/login`, `/admin` (PR admin), `/admin/products`, `/admin/products/new`, `/admin/products/:id/edit`, `/admin/categories`, `/admin/brands`, `/admin/colors`, `/admin/sizes`, `/admin/roles`, `/admin/users`, `/admin/stores`, `/admin/inventory`, `/admin/reviews`, `/admin/rentals`, `/admin/invoices`, `/admin/analytics`, `/admin/wallet`, `/admin/coupons`, `/admin/inquiries`, `/admin/reminders`, `/admin/reports`, `/admin/orders`, `/admin/orders/:id`, `/admin/pos/conflicts`

**Guards:** `ProtectedRoute` redirects to `/auth/login` or `/admin/login` with `{ state: { from } }`.

### 9.6 Layout

- **Customer `Layout`**: Header + children + Footer, plus overlay widgets — `AnnouncementBar`, `MobileBottomNav`, `MiniCart`, `CompareDrawer`, `QuickViewModal`, `ProductSearchModal`, `ExitIntentPopup`, `WhatsAppButton`, `PWAInstallPrompt`, `ReminderBanner`, `SaleCountdownBanner`.
- **Header** (663 lines): logo, mega-menu nav — Home, **Kurti** (Long/Short/Designer), **Gown** (Anarkali/Designer/Party), **Saree** (Silk/Banarasi/Designer), **Jewellery** (Necklace/Earrings/Bangles) — search overlay, wishlist count, cart badge, user menu.
- **Footer**: About / Customer Services / My Account columns, Newsletter section, mobile accordion toggles.
- **AdminLayout** (389 lines): collapsible sidebar with 7 nav sections:
  - **Main**: Dashboard, Analytics
  - **Catalog**: Products, Categories, Brands, Colors, Sizes, Rentals, Coupons
  - **Customer Service**: Reviews, Inquiries, Reminders
  - **Orders & Fulfillment**: Orders
  - **Finance**: Invoices, Wallet
  - **Admin**: Roles, Admin Users, Reports
  - **Settings**: Stores, Inventory

---

## 10. UI Design System

### 10.1 Color palette (`frontend/tailwind.config.js`)

| Token | Value | Usage |
|---|---|---|
| **primary-500** | `#9A8573` | Brand accent (beige/brown) |
| primary-600 | `#7A6A5C` | Hover states |
| primary-700 | `#5D5047` | Pressed states |
| primary-900 | `#2A2522` | Dark text |
| **accent-500** | `#2D8C7E` | Deep teal (secondary/CTA) |
| accent-600 | `#1F6E64` | Accent hover |
| neutral-cream | `#F9F7F2` | Page background |
| neutral-beige | `#E8DCD0` | Cards/sections |
| neutral-dark | `#666666` | Secondary text |
| neutral-nearBlack | `#1A1A1A` | Headings |
| success / error / warning | semantic | Form states |

The old pink/maroon palette is commented as DEPRECATED.

### 10.2 Typography

- **Google Fonts**: Inter, Nunito Sans, Playfair Display.
- Headings use `font-display` (**Playfair Display**); body uses `font-sans` (**Inter**).
- Semantic scale: `hero-eyebrow` 40px italic 800 · `hero-headline` 64px 700 · `section-title` 32px · `section-subtitle` 18px · `product-title` 16px · `product-price` 18px · `nav-link` 15px · `body` 16px · `caption` 12px.

### 10.3 Global CSS (`frontend/src/styles/globals.css`)

- CSS variables for all design tokens (`--color-primary-500`, `--color-accent-500`, type scale `--font-size-h1..small`, spacing scale).
- Dark-mode tokens prepared for future use.
- `index.html` — fonts preconnect, inline loading spinner (beige `#fafaf9` bg, `#9A8573` spinner), loads `/rrfashion/runtime-env.js` before bundle, `theme-color #9A8573`.

### 10.4 UI primitives

`components/ui/`: Button, Badge, Card, Input, Select, Modal, ConfirmDialog, DataTable, PermissionMatrix.
`components/common/`: ProductCard (+ ProductBadge, ColorSwatches, QuickActions, RateStars), MiniCart, QuickViewModal, CompareDrawer, SearchModal, TrustBar, PromoBanner, MarqueeTicker, FreeShippingBar, DealTimer, RecentlyViewed, Breadcrumb, EmptyState, LazyImage, Skeleton, StockIndicator, SizeSelector, AddToCartButton, EnhancedAddToCartButton, UploadProgressTracker, WhatsAppButton, PWAInstallPrompt, ExitIntentPopup, ReminderBanner, SaleCountdownBanner, MobileBottomNav, RouteChangeWatcher, ErrorBoundary, LoadingSpinner, PageTransition, ProtectedRoute.

**Animations:** framer-motion for `PageTransition` + header animations; swiper for hero/related-product sliders.

---

## 11. Storefront Pages & Features

### Home (`pages/Home/index.tsx`)
Section flow: **HeroBanner → PromoBanner → TrustBar → CategoryCards → CountdownBanner** (7-day rolling, "Limited-Time Deals On!" 50%) → **ProductCollectionTabs** (New Arrivals / Best Sellers / On Sale) → **ProductCollection "Kurti Collection"** (promoTile after 2, "Super Sale Up to 50%") → **BrandCarousel → BlogSection → Testimonials → InstagramShop → Newsletter → MarqueeTicker**.
Data via `useLandingPageData` (categories + 4 product sections). Sub-components: HeroSlider, BannerTile, ImageGallery, Lookbook, PromoTile, ProductCollection (with tabs), CountdownBanner, BlogSection, BrandCarousel, Testimonials, InstagramShop, Newsletter, CategoryCards.

### Shop
`Shop/index.tsx` + `components/ProductFilters.tsx` + `ProductGrid.tsx` — filters + sort + category; responsive grid; test-covered.

### ProductDetail
Swiper gallery + thumbnails, zoom, Breadcrumb, `ProductInfo` (`purchaseType: 'sale' | 'rent'` toggle with rent price/day; RENTABLE badge; color/size selectors; add-to-cart), ProductReviews, RelatedProducts, RecentlyViewed; `imageUrl(img, product.version)` for cache-busted assets.

### Cart
Guest shopping banner with login CTA, CartItem + CartSummary, FreeShippingBar; `useCart()` (server + optimistic).

### Checkout
3-step wizard `STEPS = [{id:'shipping'},{id:'payment'},{id:'review'}]`; `CheckoutForm.tsx` — saved addresses or new-address form with client validation (pincode 6-digit regex, phone regex), payment method `'razorpay' | 'cod'`, `loadRazorpayScript()`, `verifyPayment()`, invalidates order/cart queries; `OrderSummary.tsx`; `GuestCheckout.tsx` for guest flow; empty-cart redirect guard with a state machine.

### Orders / OrderDetail
Paginated (10/page) `useMyOrders`, OrderCard, repurchase action, invoice PDF download (blob → `invoice-{orderId}.pdf`); OrderDetail shows tracking timeline + status.

### Profile
ProfileForm, AddressList, AddressForm; account photo upload (`POST /api/profile/photo`).

### Wishlist
List from `useWishlist` (API + guest), move-to-cart, add-all-to-cart, remove; guest fallback.

### Compare
Persisted `compareStore` list, table with rating helper (⚠️ ratings are mock — see §19).

### Sale
`useSaleProducts`, sort options (discount/price-low/price-high/newest) mapped to `{sortBy, sortOrder}`, limit 20.

### Auth
Login, Register (OTP flow).

### POS (`pages/POS/PosPage.tsx`)
Full offline-first POS — see §8.3.

### Static pages
Contact, FAQ, ShippingReturns. Plus DesignSystemShowcase demo page.

---

## 12. Admin Dashboard & Management Pages

### 12.1 Dashboard (`pages/Admin/Dashboard`)
KPI cards + charts (implementation via `useAnalytics` / dashboard data).

### 12.2 Analytics (`pages/Admin/Analytics`) — **dashboard deep-dive**
The analytics dashboard is the reporting center of the admin panel. Backed by `modules/analytics`:

- **View selector**: `day | week | month | year` — passes `?view=` to `GET /api/admin/analytics/dashboard`.
- **KPI metrics returned:**
  - `totalRevenue`
  - `totalOrders`
  - `averageOrderValue`
  - `totalCustomers`
  - `totalProducts`
  - `activeRentals`
  - `revenueGrowth`, `ordersGrowth` (period-over-period)
- **Revenue chart**: `GET /api/admin/analytics/revenue-chart` — daily buckets across the selected period.
- **Top products**: `GET /api/admin/analytics/top-products`.
- **Channel/type split**: `channelSplit` / `typeSplit` helper aggregations (online vs POS; sale vs rent).
- **Exports**: `POST /api/admin/analytics/export` queues a `report-export` BullMQ job that generates CSV/Excel/PDF and updates `ReportExport.status`; downloads surfaced on the Reports page.

**Implementation notes:** metrics are computed live via Prisma aggregation (no materialized rollups — see §19 risk).

### 12.3 Other admin pages

| Page | Function |
|---|---|
| **Products** | `ProductList.tsx` + `ProductForm.tsx` — drag-drop image gallery (@dnd-kit), variant editor, sale set, image upload with SSE progress + temp uploads |
| **Categories / Brands / Colors / Sizes** | CRUD lists (ColorList tested) |
| **Inventory** | `InventoryView.tsx` + `StockAdjustmentModal` — locks, low-stock, stock audits |
| **Orders** | list + `OrderDetail.tsx`, `StatusUpdateModal` + `PaymentStatusUpdateModal` |
| **Reviews** | moderation (`PATCH /api/admin/reviews/:id/moderate`) |
| **Rentals** | rental lifecycle management |
| **Invoices** | GST invoices list/detail/PDF |
| **Wallet** | customer wallet transactions + stats |
| **Coupons** | coupon CRUD |
| **Inquiries** | inquiry list + assignment |
| **Reminders** | site reminders CRUD |
| **Reports** | export queue + file downloads |
| **Roles** | role CRUD + PermissionMatrix |
| **Users** | admin users CRUD + status |
| **Stores** | store locations CRUD |
| **Conflicts** | POS sync conflict resolution |
| **Login** | admin authentication |

---

## 13. API Reference

All endpoints are under the global prefix **`/api`**. Response envelope: `{ success: true, data, timestamp }`; errors: `{ success: false, error: { code, message, details? } }`. Auth: HTTP-only cookies (`access_token` / `admin_access_token`) or Bearer token; CSRF guard skipped when Authorization header present.

### 13.1 Auth & Users

| Endpoint | Method | Auth | Notes |
|---|---|---|---|
| `/auth/login` | POST | public (5/min) | `{email, password}` → user + tokens |
| `/auth/register` | POST | public | register + guest merge |
| `/auth/refresh` | POST | refresh | rotation in transaction |
| `/auth/logout` | POST | yes | revokes refresh token |
| `/auth/otp/send` | POST | public | SMS OTP |
| `/auth/otp/verify` | POST | public | attempts-limited |
| `/auth/me` | GET | yes | current user |
| `/auth/guest-create` | POST | public | guest account + auto cart |
| `/profile` | GET/PATCH | yes | user profile |
| `/profile/photo` | POST | yes | avatar upload |
| `/profile/delete-account` | DELETE | yes | |
| `/users` | GET/POST | yes | admin user mgmt |
| `/users/:id` | GET/PATCH/DELETE | yes | |
| `/addresses` | GET/POST | yes | saved addresses |
| `/addresses/:id` | PATCH/DELETE | yes | |
| `/addresses/:id/default` | PATCH | yes | |

### 13.2 Admin Auth

| Endpoint | Method | Notes |
|---|---|---|
| `/admin/auth/login` | POST | bcrypt 12, revokes previous sessions |
| `/admin/auth/refresh` | POST | |
| `/admin/auth/me` | GET | admin + role + permissions + storeIds |
| `/admin/auth/logout` | POST | |
| `/admin/sessions` | GET | active sessions |
| `/admin/sessions/revoke-all` | POST | |
| `/admin/sessions/:id/revoke` | POST | |

### 13.3 Catalog

| Endpoint | Method | Notes |
|---|---|---|
| `/products` | GET | filters: categoryId, search, minPrice, maxPrice, onSale, sortBy, sortOrder, page, limit → `{items,total,page,limit,categories}` |
| `/products/:id` | GET | product + variants + images + reviews + category |
| `/products` | POST/PATCH/DELETE | admin |
| `/products/:id/sale` | POST | set-sale |
| `/products/:productId/variants/:variantId/images` | POST | image upload |
| `/products/:productId/variants/:variantId/promote-images` | POST | reorder/promote |
| `/categories` | GET | tree with product counts |
| `/categories/:id` | GET/POST/PATCH/DELETE | admin CRUD |
| `/brands` `/colors` `/sizes` | GET + CRUD | same pattern |
| `/sale` | GET | on-sale products |
| `/images/proxy/:key(*)` | GET | image proxy |

### 13.4 Cart / Wishlist / Guest

| Endpoint | Method | Notes |
|---|---|---|
| `/cart` | GET | |
| `/cart/add` | POST | variantId, quantity, type (sale/rent), rentStart/rentEnd |
| `/cart/items/:itemId` | PATCH | quantity |
| `/cart/items/:itemId` | DELETE | |
| `/cart/merge` | POST | guest→user merge |
| `/wishlist` | GET/POST | `@AllowGuest` |
| `/wishlist/:variantId` | DELETE | |
| `/wishlist/merge` | POST | |
| `/wishlist/add-all-to-cart` | POST | |
| `/guest/start` | POST | 10/min, guest JWT |
| `/guest/refresh` | POST | rotates tokenVersion |
| `/guest/cart…` `/guest/address…` `/guest/orders…` `/guest/wishlist…` | GET/POST | guest-scoped CRUD |

### 13.5 Orders / Payments / Rentals / Shipping / Invoices

| Endpoint | Method | Notes |
|---|---|---|
| `/orders` | POST | create (Razorpay) |
| `/orders/my` | GET | customer orders paginated |
| `/orders/:id` | GET | |
| `/orders/:id/repurchase` | POST | |
| `/orders/:id/return` | POST | initiateReturn |
| `/orders/:id/tracking` | GET | |
| `/orders/:id/invoice/download` | GET | PDF blob |
| `/orders/apply-coupon` | POST | coupon code validation |
| `/admin/orders` | GET | findAllAdmin (filters) |
| `/admin/orders/:id` | GET | |
| `/admin/orders/:id/status` | PATCH | + status log |
| `/admin/orders/:id/payment-status` | PATCH | |
| `/payments/health` | GET | Razorpay circuit-breaker health |
| `/payments/create-order` | POST | Razorpay order |
| `/payments/verify` | POST | |
| `/payments/webhook` | POST | raw body HMAC + dedup |
| `/payments/refund` | POST | |
| `/rentals` | GET/POST | checkAvailability / book |
| `/rentals/:id/confirm-pickup` `/process-return` `/inspect` `/close` `/extend` | POST | lifecycle |
| `/rentals/deposits` | POST | create/capture/release |
| `/admin/rentals` | GET/POST | admin lifecycle |
| `/shipping/check-pincode` | POST | |
| `/orders/:orderId/shipping-address` | GET/POST | |
| `/orders/:orderId/courier` | GET/POST | courier receipts |
| `/invoices/generate` | POST | GST invoice + PDF |
| `/invoices/credit-note` | POST | |
| `/invoices/:id` | GET | |
| `/invoices/order/:orderId` | GET | |
| `/invoices/order/:orderId/download` | GET | |
| `/admin/invoices` | GET | |
| `/admin/invoices/:id` | GET | |
| `/admin/invoices/:id/pdf` | GET | |

### 13.6 Inventory / POS / Admin features

| Endpoint | Method | Notes |
|---|---|---|
| `/admin/inventory/summary` | GET | per-store |
| `/admin/inventory/variants/:id` | GET | detail |
| `/admin/inventory/locks` | POST | createLock (24h) |
| `/admin/inventory/locks/:id/release` | POST | |
| `/admin/inventory/low-stock` | GET | |
| `/admin/inventory/stock-movements` | GET/POST | |
| `/admin/inventory/stock-adjustments` | POST | adjustStock |
| `/admin/inventory/audit-logs` | GET | |
| `/pos/register` | POST | device registration |
| `/pos/inventory` | GET | device-scoped |
| `/pos/orders` | POST | |
| `/pos/sync` | POST | batch mutations `{clientUuid, entity, operation, data}` with `x-pos-api-key` + `x-pos-device-id` |
| `/admin/analytics/dashboard` | GET | `?view=day\|week\|month\|year` |
| `/admin/analytics/revenue-chart` | GET | |
| `/admin/analytics/top-products` | GET | |
| `/admin/analytics/export` | POST | queues report-export |
| `/admin/roles` | GET/POST/PATCH | role CRUD |
| `/admin/roles/:id/permissions` | PATCH | assign permissions |
| `/admin/permissions` | GET | |
| `/admin/users` | GET/POST/PATCH | admin users |
| `/admin/users/:id/status` `/admin/users/:id/deactivate` | PATCH | |
| `/admin/stores` | GET/POST/PATCH | stores |
| `/admin/reviews` | GET | moderation list |
| `/admin/reviews/:id/moderate` | PATCH | approve/reject |
| `/admin/wallet/transactions` `/admin/wallet/stats` | GET | |
| `/wallet/balance` `/wallet/transactions` `/wallet/credit` `/wallet/debit` | GET/POST | customer wallet |
| `/coupons` | GET/POST/PATCH/DELETE | admin |
| `/coupons/apply` | POST | |
| `/inquiries` | GET/POST/PATCH | + admin assignment |
| `/admin/reminders` | GET/POST/PATCH/DELETE | site reminders |
| `/reminders/active` | GET | public active reminders |
| `/notifications` | GET | user notifications |
| `/notifications/test` | POST | |
| `/admin/jobs/trigger-cart-abandonment` `/trigger-guest-cleanup` | POST | manual cron triggers |
| `/upload/progress/:uploadId` | GET | SSE |
| `/upload/status/:uploadId` | GET | |
| `/upload/temp` | POST/DELETE | temp uploads |
| `/health` `/ready` | GET | probes |
| `/metrics` | GET | prometheus (admin-guarded) |

---

## 14. Key Business Flows

### 14.1 Authentication flow
1. `POST /api/auth/login` (rate-limited 5/min) validates email+password with bcrypt (12 rounds).
2. Issues JWT access token (15 min) + rotating refresh token (7 days) in an HTTP-only cookie; refresh rotation revokes old + issues new inside one `$transaction`.
3. Admin login (`POST /api/admin/auth/login`) additionally **revokes all previous sessions** and updates `lastLoginAt`.
4. OTP path: `send` hashes the OTP with `AUTH_OTP_HASH_SECRET` and stores attempts/expiry; `verify` is attempts-limited and phone+IP throttled.

### 14.2 Order creation (Razorpay)
1. `create()` — customer or guest cart is read, validated; runs inside a `$transaction`.
2. Generates a unique `orderNumber`, creates order with items (sale or rent with dates).
3. Creates Razorpay order with retry; falls back to a payment link if needed.
4. Frontend loads `checkout.razorpay.com` script, opens the checkout, then `verifyPayment()` verifies server-side.
5. Webhook `POST /api/payments/webhook` verifies the raw-body HMAC signature, dedupes via Redis key `webhook:razorpay:${eventId}` (TTL 86400s) **and** the `ProcessedWebhookEvent` table, then triggers invoice generation.
6. Razorpay calls are wrapped in an **opossum circuit breaker**; failures are documented in `docs/runbooks/payment-failures.md`.

### 14.3 Rental booking & lifecycle
1. `checkAvailability` runs raw SQL `booking_period && tstzrange(...'[)')` GiST overlap query per variant/store.
2. `book` creates a `RentalBooking` with `bookingPeriod` tstzrange + optional deposit (Razorpay PreAuth → `razorpayPreAuthId`).
3. Lifecycle: `confirmPickup` → `processReturn` → `inspect` (inspection notes/photos) → `close` (settles late fee + damage charge) or `extend` (additional GiST overlap check; extension record).
4. Overdue rentals tracked (metrics: `rentalOverdueTotal`, `rentalStatus`).

### 14.4 Inventory & locking
- Per-variant/per-store `InventorySummary` counters keep available/reserved/locked/sold.
- `createLock` creates a 24h lock (`InventoryLock`) used for the offline-booking 1-day item lock; `createOrderLock` ties a lock to an order; `releaseExpiredLocks` sweeps expired locks.
- `adjustStock` writes a `StockMovement` (typed) and an optional `StockAudit` for physical-count reconciliation.
- Metrics emitted: `inventoryConflicts`, `posSyncLag`, `posPendingOutbox`.

### 14.5 Guest shopping
1. `POST /api/guest/start` (guest throttler 10/min) creates a `GuestSession`, issues a guest JWT (`type:'guest'`, `ver` = tokenVersion).
2. Guest cart/wishlist/address/orders are stored in dedicated `Guest*` tables; `StoreAuthGuard` with `@AllowGuest` lets guest tokens hit shared customer routes.
3. Stale-token rejection: server compares JWT `ver` claim against `GuestSession.tokenVersion`; `refresh` rotates tokenVersion.
4. TTL 30 days; guest cleanup is triggerable via `/api/admin/jobs/trigger-guest-cleanup`.
5. Registration/login merges guest carts + wishlists (transactional merge endpoints).

### 14.6 POS offline sync
1. Device registers via `POST /api/pos/register` (uuid + API key hash).
2. Local Dexie writes → outbox rows in `syncQueue` with `clientUuid`.
3. `POST /api/pos/sync` sends batch mutations; server applies idempotently (dedupe by `clientUuid`) and returns conflict records for items whose server state diverged.
4. Conflicts surfaced at `/admin/pos/conflicts` for manual resolution.
5. Metrics `posSyncLag` / `posPendingOutbox` track backlog.

### 14.7 GST invoicing
- `POST /api/invoices/generate` computes taxable value + CGST/SGST/IGST, `amountInWords` (via `number-to-words` util), generates a PDF (`pdfkit`), stores in storage (S3/MinIO or local), and reserves a number from `InvoiceSequence` (per store + financial year).
- Credit notes reference a parent invoice; `InvoiceType = CREDIT_NOTE`.
- e-Invoice fields (`eInvoiceIrn`, `eInvoiceAckDate`, `eInvoiceStatus`) exist in the model for future integration.

---

## 15. Background Jobs, Queues & Scheduling

### 15.1 BullMQ queues (`bull/bull.module.ts`, `RedisModule` root connection)

| Queue | Processor | Purpose |
|---|---|---|
| `notifications` | `notification.processor.ts` | Email via `mailer.service.ts` (nodemailer); sale alerts via Socket.IO gateway |
| `report-export` | `export.processor.ts` | CSV/Excel/PDF report generation; updates `ReportExport.status` |
| `image-upload-queue` | `image-upload.processor.ts` | Async image processing/upload |

### 15.2 Socket.IO real-time
- `NotificationsGateway` on namespace `/notifications`; clients join room `user-${userId}`; emits `sale_alert` events.

### 15.3 Scheduled/manual cron triggers
- `ScheduleModule.forRoot()` registered.
- Manual trigger endpoints: `POST /api/admin/jobs/trigger-cart-abandonment`, `POST /api/admin/jobs/trigger-guest-cleanup`.
- `reminders` controller exposes manual trigger endpoints.

### 15.4 Metrics (prom-client)
`httpRequestsTotal`, `httpRequestDuration`, `dbQueryDuration`, `inventoryConflicts`, `posSyncLag`, `posPendingOutbox`, `orderProcessingDuration`, `rentalStatus`, `rentalOverdueTotal`, `webhookProcessing`, `cacheOperations` — exposed at `GET /api/metrics` (admin-guarded).

---

## 16. Security Configuration

| Control | Implementation |
|---|---|
| **CORS** | Explicit allow-list (prod: rrfashion.com, admin.rrfashion.com, GitHub Pages; dev: localhost); `credentials: true`; never `*` |
| **Helmet / headers** | CSP (`defaultSrc 'self'`, `scriptSrc 'self' 'unsafe-inline'`, frameSrc/objectSrc `'none'`, `upgradeInsecureRequests`, reportOnly in dev), HSTS 1yr preload, frameguard deny, noSniff, referrerPolicy, CORP, xssFilter, hidePoweredBy |
| **Auth tokens** | HTTP-only cookies `access_token`/`admin_access_token` (secure in prod, sameSite strict/none); Bearer fallback; refresh rotation in transactions; guest tokens with `tokenVersion` staleness check |
| **Rate limiting** | 5 named throttlers, Redis-backed storage, proxy-aware (X-Forwarded-For) |
| **CSRF** | Global `CsrfGuard` for cookie/form posts without Authorization; `x-csrf-token` ≥8 chars or Origin/Referer check |
| **Validation** | Global whitelist/forbid-non-whitelisted ValidationPipe + `SanitizePipe` (isomorphic-dompurify) |
| **Cache headers** | `no-store` middleware on `/api/auth`, `/api/cart`, `/api/orders`, `/api/profile`, `/api/wallet`, `/api/guest` + admin paths; PWA service worker caches only public catalog endpoints |
| **Upload security** | Magic-bytes MIME validation, upload throttler (20/min), 1 MB body limit, temp uploads with SSE progress |
| **Secrets guard (SEC-18)** | Startup assertions fail in production if `JWT_SECRET`/`JWT_ADMIN_SECRET`/`AUTH_OTP_HASH_SECRET` equal dev fallbacks |
| **Observability** | Swagger gated (dev / `SWAGGER_ENABLED=true`); `/api/metrics` admin-guarded; correlation-id on all requests |
| **Webhook security** | Razorpay raw-body HMAC verification + Redis dedup + DB dedup table |

---

## 17. Testing

### Backend (Jest)
- `testRegex: .*\.spec\.ts$`, rootDir `src`, ts-jest.
- **~21 unit spec files**: auth, cart, colors, coupons, guest-address, guest-session, notifications.gateway, orders, payments, products, reviews, site-reminders, invoices, users, wallet, wishlist, rentals, csrf.guard, guest-session-id.decorator, store-auth.guard, no-store.middleware, number-to-words.util.
- **E2E** (`backend/test/`): `app.e2e-spec.ts` + `orders.e2e-spec.ts` using **Testcontainers** (`startContainers/stopContainers`, `migrations.ts`, `seed.ts`); CI runs against real PostGIS 16 + Redis 7.

### Frontend (Vitest)
- Vitest + Testing Library + jsdom; `setupFiles: ['src/test/setup.ts']` (mocks `window.matchMedia`, jest-dom matchers, cleanup).
- **~40 test files**: api client, ImageGallery, ImageUploader, Breadcrumb, DealTimer, FreeShippingBar, MiniCart, MobileBottomNav, PageTransition, PromoBanner, PWAInstallPrompt, QuickViewModal, RecentlyViewed, SizeGuide, TrustBar, WhatsAppButton, AnnouncementBar, Footer, useAddresses, useCart, useWishlist, useLandingPageData, ColorList, Orders index, Checkout, CheckoutForm, HeroBanner, HeroSlider, Lookbook, Newsletter, PromoTile, Testimonials, ProductInfo, ProductReviews, ProductFilters, ProductGrid, retryLazy, sanitize.

---

## 18. Deployment & Infrastructure

### 18.1 Docker Compose (`docker-compose.yml`)
Services: **postgis:16-3.4**, **redis:7-alpine**, **minio** (S3-compatible), **backend** (NestJS). Razorpay test keys present as dev fallbacks.

### 18.2 Dockerfiles
- Root `Dockerfile` — multi-stage (build → runtime) for the backend + static frontend.
- `backend/Dockerfile` — backend-only image.

### 18.3 Kubernetes (`k8s/`)
10 manifests: `namespace`, `configmap`, `secrets`, `deployment`, `hpa`, `ingress`, `cronjob`, `postgres`, `redis`, `minio`. Reference production domains `api.rrfashion.com` / `admin.rrfashion.com` and image `ghcr.io/ashup1711/rrfashion:latest`. **Status: aspirational/backup** — the active live deployment is GitHub Pages + Docker Compose on a Mac Mini behind ngrok (see `frontend/DEPLOYMENT.md`).

### 18.4 CI/CD (`.github/workflows/`)
- `ci.yml` — install, lint, unit tests against PostGIS/Redis service containers.
- `deploy.yml` — `actions/deploy-pages@v4` (requires Pages source = "GitHub Actions").

### 18.5 Frontend deployment
- GitHub Pages at `https://ashup1711.github.io/rrfashion/`; HashRouter + `vite base: '/rrfashion/'`; runtime config injectable via `/rrfashion/runtime-env.js`.
- `frontend/DEPLOYMENT.md` documents the live path.

---

## 19. Known Gaps & Risks

> Documented as observed on disk — useful for planning, not criticism.

1. **Deployment mismatch**: k8s manifests target `api.rrfashion.com` / ghcr image, but the active live deployment is GitHub Pages + Docker Compose behind ngrok. The k8s path appears aspirational/backup.
2. **Razorpay test credentials in `docker-compose.yml`** — dev-only; prod startup assertions enforce real secrets (SEC-18) but the compose file still carries them.
3. **CSP `'unsafe-inline'` scriptSrc** — documented tradeoff for the inline loading spinner + Vite preloads.
4. **Notifications**: email via SMTP/Nodemailer (MailHog-style localhost); no production SMS provider adapter — OTP "SMS service" is a thin abstraction.
5. **Analytics computed live** via Prisma aggregation — no materialized rollups; performance risk at scale.
6. **Test coverage gaps**: no frontend coverage for POS page/sync engine or Admin Analytics/Wallet/Reports pages; no backend specs for analytics/inventory/pos controllers.
7. **Compare page ratings are mock** (`id.length % n` pseudo-ratings) — not from backend data; the `RateStars` component is the real rating UI.
8. **`StockAudit` model exists but no controller route found** — audit functionality may be service-level only.
9. **`AuditLog` module** has no public controller — logging likely written via service calls.
10. **Product-grid duplication**: historically three product-grid implementations (Shop/ProductGrid vs Home/ProductCollection flex-4 vs dead FeaturedProducts); ProductCollection still uses hard-coded flex slots.
11. **Orders UI**: no tab structure (paginated list + OrderCard) despite some marketing claims of tabs.

---

## 20. Appendix: File Index

### Backend
- `backend/src/main.ts`, `app.module.ts`
- `backend/src/config/{env,database,auth,redis,storage}.config.ts`, `constants.ts`
- `backend/src/common/strategies/{jwt,admin-jwt}.strategy.ts`
- `backend/src/common/guards/{jwt-auth,admin-jwt-auth,optional-jwt-auth,roles,permissions,store-auth,csrf,throttler-proxy,otp-throttler}.guard.ts`, `store-auth.module.ts`
- `backend/src/common/decorators/{public,roles,permissions,current-user,guest-session-id,allow-guest,api-response}.decorator.ts`
- `backend/src/common/middleware/{correlation-id,no-store}.middleware.ts`
- `backend/src/common/interceptors/transform.interceptor.ts` (+ metrics interceptor)
- `backend/src/common/filters/http-exception.filter.ts`
- `backend/src/common/pipes/sanitize.pipe.ts`
- `backend/src/common/providers/redis-throttler-storage.service.ts`
- `backend/src/common/utils/{number-to-words,magic-bytes-validator,tax,sanitize,slugify}.ts`
- `backend/src/prisma/`, `backend/src/redis/`, `backend/src/bull/`, `backend/src/storage/`, `backend/src/health/`, `backend/src/metrics/`, `backend/src/uploads/`
- `backend/src/modules/` — 36 feature module directories
- `backend/prisma/{schema.prisma,seed.ts,migrations/}`
- `backend/test/{app.e2e-spec.ts,orders.e2e-spec.ts,jest-e2e.json,utils/}`
- `backend/**/*.spec.ts` (~21 files)

### Frontend
- `frontend/src/main.tsx`, `App.tsx`
- `frontend/src/routes/index.tsx`
- `frontend/src/api/*.ts` (33 files + client.test.ts)
- `frontend/src/store/{authStore,adminStore,cartStore,compareStore,guestStore,uiStore,wishlistStore}.ts`
- `frontend/src/hooks/*.ts` (35 hooks + tests)
- `frontend/src/utils/{constants,formatCurrency,guestConstants,guestSession,guestSessionInit,imageUrl,loadRazorpay,logger,navigation,persistentStorage,productHelpers,retryLazy,sanitize,validators}.ts`
- `frontend/src/lib/{db,sync}.ts`
- `frontend/src/components/{common,layout,admin,auth,ui}/*`
- `frontend/src/pages/*` — Home, Shop, ProductDetail, Cart, Checkout, Orders, Auth, Profile, Sale, Wishlist, Compare, Contact, FAQ, ShippingReturns, POS, Admin/*
- `frontend/src/types/*.ts` (21 files), `frontend/src/styles/globals.css`, `frontend/src/test/`
- `frontend/tailwind.config.js`, `vite.config.ts`, `vitest.config.ts`, `index.html`

### Infra / Docs
- `docker-compose.yml`, `Dockerfile` (root), `backend/Dockerfile`
- `k8s/` (10 manifests), `.github/workflows/{ci,deploy}.yml`
- `docs/runbooks/payment-failures.md`
- Root planning docs: `ROOT_CAUSE_ANALYSIS.md`, `LANDING_PAGE_REVAMP_PLAN.md`, `IMPLEMENTATION_SUMMARY.md`, `HERO_SECTION_IMPLEMENTATION.md`, `mental_model.txt`, `requrirnment.txt`, `session-ses_067b.md`

---

*End of document. Generated from a full exploration of the repository — schema, modules, routes, components, tests, security config, and deployment assets. For pipeline-generated artifacts (explore findings, research reports, coverage manifests), see `.opencode/state/`.*
