# QA Report — RR FASHION

## Summary
- **Status**: REVISION_NEEDED
- **Code Review**: FAIL (15 issues)
- **QA Verification**: FAIL (4 failures)
- **Retry Count**: 2 (previous retries) → now at 3 (this review)

---

## Phase 1: Code Review Results

### Security (5 issues)

| # | Type | Location | Issue | Fix |
|---|------|----------|-------|-----|
| 1 | Security | `backend/src/modules/orders/orders.controller.ts:116` — `findOne()` | No `@UseGuards(JwtAuthGuard)`. While it throws `NotImplementedException`, an unauthenticated route exposing order data is a security gap. Same for `update()` at line 122. | Add `@UseGuards(JwtAuthGuard)` to `findOne()` and `update()`. If these are to remain blocked, add `@Public()` + keep the throw. |
| 2 | Security | `backend/src/modules/orders/orders.controller.ts:22` — `create()` | No `@UseGuards(JwtAuthGuard)`. Blocked by `NotImplementedException` but still a gap. | Add auth guard or `@Public()` decorator for consistency. |
| 3 | Security | `backend/src/modules/orders/orders.service.ts:330-367` — `guestCheckout()` | Order creation (line 330) and guest email update (line 347) are NOT wrapped in a Prisma `$transaction`. If the email update fails after order creation, the order is orphaned without the user's email. | Wrap order creation + email update inside `this.prisma.$transaction(async (tx) => { ... })`. |
| 4 | Security | `backend/src/modules/orders/orders.service.ts:295-326` — `guestCheckout()` item validation | Queries each variant individually in a `for` loop (N+1 pattern). Each iteration does `findUnique`. For an order with 10 items, that's 10+ DB roundtrips. | Use `findMany` with `where: { id: { in: variantIds } }` to fetch all variants in a single query, then validate in-memory. |
| 5 | Security | `backend/src/modules/orders/orders.service.ts:66` — `findMyOrders()` | No pagination cap on `limit`. User can request `?limit=1000000` and cause memory pressure or slow queries. | Apply `Math.min(limit, 100)` to cap maximum page size. |

### Error Handling (1 issue)

| # | Type | Location | Issue | Fix |
|---|------|----------|-------|-----|
| 6 | Error handling | `backend/src/modules/invoices/invoices.service.ts:250` — `nextInvoiceNumber()` | Calls `SELECT next_invoice_number(...)` PostgreSQL function, but this function is **not defined in any migration file**. The `InvoiceSequence` table exists but the PL/pgSQL function with `pg_advisory_xact_lock` was never created. Invoice generation will fail at runtime. | Add a raw SQL migration to create the `next_invoice_number()` function using `pg_advisory_xact_lock` pattern. |

### Pattern Violations (6 issues)

| # | Type | Location | Issue | Fix |
|---|------|----------|-------|-----|
| 7 | Pattern violation | `backend/src/modules/cart/cart.controller.ts` — all 5 endpoints (lines 29, 39, 49, 63, 73) | **Still not fixed from previous QA run.** All `@ApiCommonResponse` decorators lack `type` parameter. Research report states: "Always specify type for proper schema generation." | Add `type: CartResponseDto` (or equivalent) to each endpoint. |
| 8 | Pattern violation | `backend/src/modules/orders/orders.controller.ts` — `findMyOrders` (line 41), `findMyOrder` (line 48), `guestCheckout` (line 62), `downloadInvoice` (line 69), `initiateReturn` (line 87), `applyCoupon` (line 100), `getTracking` (line 109) | **Partially fixed — repurchase endpoint now has type, but 7 others still missing `type`.** `@ApiCommonResponse` should include `type`. | Add appropriate type references to each. |
| 9 | Pattern violation | `backend/src/modules/brands/dto/update-brand.dto.ts:1` | Uses `PartialType` from `@nestjs/mapped-types` instead of `@nestjs/swagger`. This means `@ApiProperty()` decorators from `CreateBrandDto` will NOT be inherited in the Swagger schema. | Change to `import { PartialType } from '@nestjs/swagger';` |
| 10 | Pattern violation | `backend/src/modules/categories/dto/update-category.dto.ts:1` | Uses `PartialType` from `@nestjs/mapped-types` instead of `@nestjs/swagger`. Same issue as #9. | Change to `import { PartialType } from '@nestjs/swagger';` |
| 11 | Pattern violation | `backend/src/common/pipes/sanitize.pipe.ts` | `SanitizePipe` is created but never registered or used anywhere in the application. Not registered in `main.ts` and not imported by any module/controller. | Either register it globally in `main.ts` or remove the unused file. |
| 12 | Pattern violation | `backend/src/modules/orders/orders.service.ts:580-582` — `getInvoicePdf()` | Fragile URL parsing: `invoice.pdfUrl.split('/')` then `indexOf('invoices')`. If URL doesn't contain 'invoices', returns wrong segment. Has fallback, but fragile design. | Store `pdfStorageKey` on the `Invoice` model alongside `pdfUrl`, or add a dedicated `storageKey` field for reliable retrieval. |

### Code Quality (2 issues)

| # | Type | Location | Issue | Fix |
|---|------|----------|-------|-----|
| 13 | Quality | `backend/src/modules/cart/cart.service.ts:113-166` — `updateItem()` / `removeItem()` | Each uses 3 queries (`findUnique` cart → `findUnique` item → `update`/`delete`). Could be optimized to `findFirst` with a nested `where` clause (e.g., `findFirst({ where: { id: itemId, cart: { userId } } })`) to verify ownership in 1 query. | Replace with `findFirst` using nested `where: { id: itemId, cart: { userId } }` to do ownership check + existence check in one query. |
| 14 | Quality | `frontend/src/store/cartStore.ts:38-39` — `removeItem` / `updateQuantity` | Uses `variantId` as the deduplication key but `variantId` is optional in `CartItemState` (line 23: `variantId?: string`). If `variantId` is undefined, these operations could match/delete the wrong items. | Ensure `variantId` is always set, or use `productId` as fallback in the filter/map. |

---

## Phase 2: QA Verification Results

### Requirement Compliance (1 failure)

| # | Type | Location | Issue | Fix |
|---|------|----------|-------|-----|
| 15 | Missing requirement | `backend/prisma/migrations/*.sql` | The `next_invoice_number()` PostgreSQL function with `pg_advisory_xact_lock` is **not defined** in any migration. The `invoices.service.ts` calls it but it doesn't exist in the database. Invoice generation will fail at runtime. This was a critical recommendation from `mental_model.txt` item #2. | Create a raw SQL migration that defines the `next_invoice_number(store_id TEXT, fin_year TEXT)` function using `pg_advisory_xact_lock` pattern. |
| 16 | Missing requirement | `backend/src/modules/orders/orders.service.ts:330-367` — `guestCheckout()` | Guest checkout does **not decrement inventory stock** (neither `inventory_units` nor `inventory_summary`). Orders reduce available stock but this code just creates the order without touching inventory counts. | Add inventory decrement logic after order creation (at minimum for `inventory_summary.quantityAvailable -= item.quantity`). |

### Cross-Stack Contracts (2 failures)

| # | Type | Location | Issue | Fix |
|---|------|----------|-------|-----|
| 17 | Contract mismatch | `frontend/src/api/cart.ts:28-31` — `addToCart()` | Legacy function hits `POST /cart` with `{ productId, quantity }`. The backend expects `POST /cart/add` with `{ variantId, quantity, type }`. This function may still be called elsewhere and will fail with 404. Either update it to match the new API or remove/redirect it. | Update to use `/cart/add` endpoint with `variantId` parameter, or mark deprecated and remove any callers. |
| 18 | Contract mismatch | `frontend/src/api/orders.ts:5-13` — `getOrders()` and `getOrder()` | `getOrders()` hits `GET /orders` and `getOrder(id)` hits `GET /orders/${id}`. Both backend endpoints throw `NotImplementedException`. These frontend API methods are dead code that will always return errors. | Remove these functions or redirect them to `getMyOrders()` / `getMyOrder()`. |

### mental_model.txt Gaps (3 gaps)

| # | Type | Location | Issue | Fix |
|---|------|----------|-------|-----|
| 19 | Schema gap | `backend/prisma/schema.prisma` | mental_model.txt recommendation #2 (Critical): `InvoiceSequence` uses advisory locks. The DB has the table but the PostgreSQL function `next_invoice_number()` with `pg_advisory_xact_lock` was never created. | See issue #15. |
| 20 | Schema gap | `backend/prisma/schema.prisma` | mental_model.txt recommendation #8 (Medium): `RentalExtension` model exists ✓, but the `availability re-check flow` (re-checking availability when extending) is not implemented in any rental service method. | Add availability overlap check when creating `RentalExtension`. |
| 21 | Schema gap | `backend/prisma/schema.prisma` | mental_model.txt §9 schema: Missing `stock_audits` relation to admin users (`conductedByAdmin` and `approvedByAdmin` relations). The model exists but lacks `@@index` for `variantId` and `storeId`. | Add indexes and relations for `stock_audits`. |

### Issues Fixed Since Previous Run

| # | Previous Issue | Status |
|---|---------------|--------|
| 1 | Cart `mergeCart()` not wrapped in `$transaction` (was error #4) | **FIXED** — `cart.service.ts:246` now wraps in `tx` delegate |
| 2 | Redundant AND clause in `findOnSale()` (was error #5) | **FIXED** — Clean where clause at `products.service.ts:265-269` |
| 3 | Cart controller missing `type` in `@ApiCommonResponse` (was error #2) | **STILL PRESENT** — Not fixed |
| 4 | Orders controller missing `type` in `@ApiCommonResponse` (was error #3) | **PARTIALLY FIXED** — `repurchase` now has type, 7 others still missing |

---

## Detailed Error List

```json
[
  {
    "type": "code_review",
    "subtype": "security",
    "location": "backend/src/modules/orders/orders.controller.ts:116",
    "expected": "@UseGuards(JwtAuthGuard) on findOne() and update() endpoints",
    "actual": "No auth guard on findOne() (line 116) or update() (line 122). Blocked by NotImplementedException but still a security gap.",
    "fix": "Add @UseGuards(JwtAuthGuard) decorator to both endpoints for defense-in-depth"
  },
  {
    "type": "code_review",
    "subtype": "security",
    "location": "backend/src/modules/orders/orders.service.ts:330-367",
    "expected": "Order creation and email update wrapped in $transaction for atomicity",
    "actual": "order.create() at line 330 and user.update() at line 347 are separate operations. If email update fails, order exists without user's email.",
    "fix": "Wrap both operations in this.prisma.$transaction(async (tx) => { ... })"
  },
  {
    "type": "code_review",
    "subtype": "security",
    "location": "backend/src/modules/orders/orders.service.ts:295-326",
    "expected": "All variants fetched in a single query using findMany with { id: { in: variantIds } }",
    "actual": "Each variant fetched individually in a for loop (N+1 pattern)",
    "fix": "Aggregate variantIds from dto.items, do a single findMany, then validate in memory"
  },
  {
    "type": "code_review",
    "subtype": "error_handling",
    "location": "backend/src/modules/invoices/invoices.service.ts:250-256",
    "expected": "PostgreSQL function next_invoice_number() exists in the database with pg_advisory_xact_lock",
    "actual": "Function is called but never created in any migration. InvoiceSequence table exists but no PL/pgSQL function defined.",
    "fix": "Add raw SQL migration to CREATE FUNCTION next_invoice_number() using pg_advisory_xact_lock pattern from mental_model.txt"
  },
  {
    "type": "code_review",
    "subtype": "pattern_violation",
    "location": "backend/src/modules/cart/cart.controller.ts (all 5 endpoints)",
    "expected": "All @ApiCommonResponse decorators should include type parameter",
    "actual": "None of the 5 cart endpoints specify type (lines 29, 39, 49, 63, 73)",
    "fix": "Add type: CartResponseDto (or equivalent DTO) to each @ApiCommonResponse"
  },
  {
    "type": "code_review",
    "subtype": "pattern_violation",
    "location": "backend/src/modules/orders/orders.controller.ts:41",
    "expected": "@ApiCommonResponse should specify type for Swagger schema generation",
    "actual": "findMyOrders (line 41), findMyOrder (line 48), guestCheckout (line 62), downloadInvoice (line 69), initiateReturn (line 87), applyCoupon (line 100), getTracking (line 109) — 7 endpoints missing type",
    "fix": "Add type references: OrderHistoryQueryDto, OrderResponseDto, GuestCheckoutDto, etc."
  },
  {
    "type": "code_review",
    "subtype": "pattern_violation",
    "location": "backend/src/modules/brands/dto/update-brand.dto.ts:1",
    "expected": "PartialType imported from @nestjs/swagger for proper @ApiProperty inheritance",
    "actual": "Uses @nestjs/mapped-types which doesn't inherit @ApiProperty decorators",
    "fix": "Change to import { PartialType } from '@nestjs/swagger'"
  },
  {
    "type": "code_review",
    "subtype": "pattern_violation",
    "location": "backend/src/modules/categories/dto/update-category.dto.ts:1",
    "expected": "PartialType imported from @nestjs/swagger for proper @ApiProperty inheritance",
    "actual": "Uses @nestjs/mapped-types which doesn't inherit @ApiProperty decorators",
    "fix": "Change to import { PartialType } from '@nestjs/swagger'"
  },
  {
    "type": "code_review",
    "subtype": "pattern_violation",
    "location": "backend/src/common/pipes/sanitize.pipe.ts",
    "expected": "SanitizePipe should be registered globally in main.ts or used by relevant controllers",
    "actual": "SanitizePipe is created but never registered or imported anywhere",
    "fix": "Either register app.useGlobalPipes(new SanitizePipe()) in main.ts (after ValidationPipe) or remove the unused file"
  },
  {
    "type": "code_review",
    "subtype": "quality",
    "location": "backend/src/modules/cart/cart.service.ts:113-166",
    "expected": "updateItem/removeItem should use findFirst with nested where for ownership check in 1 query",
    "actual": "3 separate queries: findUnique cart → findUnique item → update/delete",
    "fix": "Use findFirst({ where: { id: itemId, cart: { userId } } }) to validate ownership + existence in one query"
  },
  {
    "type": "qa_failure",
    "subtype": "missing_requirement",
    "location": "backend/prisma/migrations/ (all 5 migration files)",
    "expected": "PostgreSQL function next_invoice_number() with pg_advisory_xact_lock must exist for invoice numbering",
    "actual": "No migration creates this function. InvoicesService.nextInvoiceNumber() will fail at runtime with function-not-found error.",
    "fix": "Create migration file that defines the PL/pgSQL function using pg_advisory_xact_lock pattern"
  },
  {
    "type": "qa_failure",
    "subtype": "missing_requirement",
    "location": "backend/src/modules/orders/orders.service.ts:330-367 (guestCheckout)",
    "expected": "Guest checkout should decrement inventory stock (at minimum inventory_summary.quantityAvailable)",
    "actual": "No inventory decrement logic exists in guestCheckout(). Orders created without updating stock counts.",
    "fix": "After order creation, decrement inventory_summary.quantityAvailable for each variant by ordered quantity"
  },
  {
    "type": "qa_failure",
    "subtype": "contract_mismatch",
    "location": "frontend/src/api/cart.ts:28-31",
    "expected": "Frontend addToCart should use POST /cart/add with { variantId, quantity, type }",
    "actual": "Legacy addToCart uses POST /cart with { productId, quantity } — wrong endpoint and payload shape",
    "fix": "Update to use /cart/add with variantId, or deprecate and remove callers"
  },
  {
    "type": "qa_failure",
    "subtype": "contract_mismatch",
    "location": "frontend/src/api/orders.ts:5-13",
    "expected": "getOrders() and getOrder() should hit working endpoints or be removed",
    "actual": "Both hit backend endpoints that throw NotImplementedException — dead code",
    "fix": "Remove or redirect to getMyOrders()/getMyOrder()"
  }
]
```

---

## Issues Carried Forward From Previous QA

| # | Previous ID | Description | Status |
|---|-------------|-------------|--------|
| PF-1 | Error #1 | Pre-existing frontend build errors (7 errors across 5 files) | Pre-existing — unchanged |
| PF-2 | Error #2 | Cart controller — all 5 endpoints missing `type` in @ApiCommonResponse | **STILL NOT FIXED** — re-reported as issue #7 |
| PF-3 | Error #3 | Orders controller — findMyOrders, findMyOrder, repurchase, guestCheckout missing `type` | **PARTIALLY FIXED** — repurchase now has type |
| PF-4 | Error #4 | Cart mergeCart not wrapped in $transaction | **FIXED** |
| PF-5 | Error #5 | Products findOnSale redundant AND clause | **FIXED** |

---

## What Passes QA Verification

The following contracts and requirements are verified as **correct**:

- ✅ `User.profilePhoto` and `User.profilePhotoKey` exist in Prisma schema — matches research report
- ✅ `POST /api/auth/guest` endpoint exists in `auth.controller.ts` — returns `{ guestId, guestToken }`
- ✅ `GET /api/products/on-sale` public endpoint exists — matches contract
- ✅ `PATCH /api/admin/products/:id/sale` admin endpoint exists — matches contract  
- ✅ `POST /api/orders/guest` guest checkout endpoint exists — matches contract
- ✅ `GET /api/orders/my` and `GET /api/orders/my/:id` endpoints exist — matches contract
- ✅ `POST /api/orders/my/:id/repurchase` endpoint exists — matches contract
- ✅ `GET /api/orders/:orderId/invoice` endpoint with ownership check — matches contract
- ✅ `GET /api/profile`, `PATCH /api/profile`, `POST /api/profile/photo` — all exist with auth guards
- ✅ Storage abstraction (StorageInterface, LocalStorageService, S3StorageService) — all created
- ✅ Refactored StorageService as factory delegate — matches spec
- ✅ Cart service has full business logic with real DB operations — matches requirement
- ✅ Wishlist merge accepts `guestId` — matches research report spec
- ✅ Wishlist merge properly cleans up guest entries after merge
- ✅ Repurchase wrapped in `$transaction` — clean implementation
- ✅ Profile photo upload has proper file validation (MaxFileSizeValidator + FileTypeValidator)
- ✅ Notifications gateway implemented with Socket.IO for real-time sale alerts
- ✅ `mergeGuestAccount` delegates cart merge to `CartService.mergeGuestCartIntoUserCart`
- ✅ Frontend `useAuth.ts` performs cart+wishlist merge on login after guest session
- ✅ Frontend guest store persists to localStorage
- ✅ `return_policies` model exists — matches mental_model.txt spec
- ✅ `feature_flags` model exists — matches mental_model.txt spec
- ✅ `stock_audits` model exists — matches mental_model.txt spec
- ✅ Hybrid inventory model (`inventory_units` + `inventory_summary`) — exists ✓
- ✅ `RentalBooking` model with full state machine fields — exists ✓
- ✅ `RentalExtension` model — exists ✓
- ✅ All auth DTOs have `@ApiProperty({ readOnly: false })` — verified ✓
- ✅ `create-product.dto.ts`, `register.dto.ts`, `login.dto.ts`, `logout.dto.ts`, `refresh.dto.ts` all have `readOnly: false` — verified ✓
- ✅ `update-product.dto.ts`, `update-order.dto.ts`, `update-user.dto.ts` use `PartialType` from `@nestjs/swagger` — correct ✓
- ✅ Backend `tsconfig.json` has `strictNullChecks: true`, `noImplicitAny: true` — good strictness
- ✅ Frontend `types/user.ts` includes `profilePhoto` and `profilePhotoKey` — matches backend
- ✅ Frontend `types/order.ts` includes `orderNumber`, `itemCount`, `ShippingAddress` — matches contract
- ✅ Frontend `constants.ts` has all required `ROUTES` and `QUERY_KEYS` — verified ✓

---

## Recommended Actions

1. **CRITICAL — Fix missing PostgreSQL function**: Create a raw SQL migration `backend/prisma/migrations/20260701090000_create_invoice_number_function/migration.sql` that defines the `next_invoice_number()` function with `pg_advisory_xact_lock`. Otherwise invoice generation is completely broken.

2. **CRITICAL — Wrap guest checkout in transaction**: `orders.service.ts:guestCheckout()` must wrap order creation + email update in `$transaction`. Add inventory decrement logic.

3. **HIGH — Add auth guards to legacy endpoints**: `orders.controller.ts` `findOne()` and `update()` need `@UseGuards(JwtAuthGuard)` for defense-in-depth.

4. **HIGH — Fix N+1 in guest checkout**: Aggregate variant IDs and use `findMany` with `in` operator instead of per-item queries.

5. **HIGH — Add pagination cap**: Apply `Math.min(limit, 100)` in `findMyOrders()`.

6. **HIGH — Fix PartialType imports**: `update-brand.dto.ts` and `update-category.dto.ts` must use `PartialType` from `@nestjs/swagger` not `@nestjs/mapped-types`.

7. **MEDIUM — Add `type` to @ApiCommonResponse**: All cart and order controller endpoints missing `type` need it added.

8. **MEDIUM — Clean up dead frontend code**: Remove legacy `addToCart()` and update `getOrders()`/`getOrder()` to use working endpoints.

9. **MEDIUM — Optimize cart service queries**: Use `findFirst` with nested where to reduce DB roundtrips.

10. **LOW — Register or remove SanitizePipe**: Decide whether to use it globally or remove the unused file.
