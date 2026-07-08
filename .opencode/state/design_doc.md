# Checkout Implementation Design Doc

## Feature Summary
Fix the checkout flow so authenticated users can place orders. The checkout page exists but "Place Order" does nothing because the backend `POST /orders` endpoint throws `NotImplementedException` and the frontend has no form submission handler wired.

## Requirement IDs & Traceability

| ID | Layer | Description | Priority |
|----|-------|-------------|----------|
| REQ-BE-001 | Backend | Implement `OrdersService.create()` for authenticated users — model after existing `guestCheckout()` | Critical |
| REQ-BE-002 | Backend | Expand `CreateOrderDto` to include `shippingAddress`, `paymentMethod`, `storeId?`, `notes?` | Critical |
| REQ-BE-003 | Backend | Create `POST /orders` endpoint in controller (guarded by JwtAuthGuard) that calls the new `create()` | Critical |
| REQ-BE-004 | Backend | Look up real prices from DB for order items (never trust client-provided prices) | Critical |
| REQ-BE-005 | Backend | Resolve cart items from user's cart instead of accepting arbitrary items array | High |
| REQ-BE-006 | Backend | Add shipping address persistence — create ShippingAddress record or store JSON on order | High |
| REQ-BE-007 | Payment | Implement Razorpay order creation in the checkout flow | High |
| REQ-BE-008 | Payment | Implement Razorpay payment verification webhook | Medium |
| REQ-FE-001 | Frontend | Fix `OrderSummary.tsx` — replace hardcoded data with real cart items from `useCart()` | Critical |
| REQ-FE-002 | Frontend | Wire `CheckoutForm.tsx` — add `onSubmit` handler, validation, and order creation API call | Critical |
| REQ-FE-003 | Frontend | Add Razorpay checkout.js integration on the frontend | High |
| REQ-FE-004 | Frontend | Add proper loading/error states and success redirect after order placement | High |

## Database Structural Needs (if db-expert needed)
- `orders` table already exists (Prisma schema has Order model with items, shippingAddress as JSON)
- `order_items` table already exists
- `shipping_addresses` table already exists
- `inventory_summary` table already exists
- No new migrations needed — all backend work is service-layer changes

## REST API Design

### POST /api/orders (Authenticated users)
**Request:**
```json
{
  "shippingAddress": {
    "name": "ASHUTOSH RAVAL",
    "phone": "+919725408903",
    "line1": "G 803 samved greenvalley",
    "line2": "Sargasan",
    "city": "Gandhinagar",
    "state": "Gujarat",
    "pincode": "382006"
  },
  "paymentMethod": "razorpay",
  "notes": ""
}
```
Note: Items are resolved from the authenticated user's cart — NOT passed in the request body.

**Response (201):**
```json
{
  "id": "order-uuid",
  "orderNumber": "ORD-ABCD1234",
  "status": "PENDING",
  "totalAmount": 30483,
  "items": [...],
  "razorpayOrderId": "order_...",
  "razorpayKeyId": "rzp_...",
  "amount": 3048300,
  "currency": "INR",
  "shippingAddress": {...},
  "paymentMethod": "razorpay",
  "createdAt": "2026-07-07T..."
}
```

### POST /api/payments/verify (Verify Razorpay payment)
**Request:**
```json
{
  "razorpay_order_id": "order_...",
  "razorpay_payment_id": "pay_...",
  "razorpay_signature": "...",
  "orderId": "order-uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment verified successfully"
}
```

## Cross-Stack Contracts

### React → Backend API Contracts

| React Method | Backend Route | Method | Request Shape | Response Shape |
|-------------|---------------|--------|---------------|----------------|
| `createOrder(shippingAddress, paymentMethod)` | `/api/orders` | POST | `{ shippingAddress: {...}, paymentMethod: "razorpay", notes?: "" }` | `{ id, orderNumber, status, totalAmount, items, razorpayOrderId, razorpayKeyId, amount, currency, shippingAddress }` |
| `verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId)` | `/api/payments/verify` | POST | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId }` | `{ success: true }` |
| `getCart()` | `/api/cart` | GET | — | `{ id, items: [...], total }` |

### Data Flow
1. User fills shipping address on CheckoutForm
2. User clicks "Place Order" → frontend calls `POST /api/orders` with shipping address + payment method
3. Backend resolves items from user's cart, calculates total, creates Razorpay order
4. Backend returns Razorpay order details (razorpayOrderId, amount, key_id)
5. Frontend opens Razorpay checkout.js with returned details
6. User completes payment via Razorpay
7. On success, frontend calls `POST /api/payments/verify`
8. Backend verifies signature, updates order payment status
9. Frontend redirects to order confirmation page

## Implementation Order
1. Backend: Implement `OrdersService.create()` (modeled after `guestCheckout()`)
2. Backend: Expand `CreateOrderDto` with shipping address
3. Backend: Wire Razorpay order creation + payment verification endpoints
4. Frontend: Fix `OrderSummary.tsx` to show real cart data
5. Frontend: Wire `CheckoutForm.tsx` with submit handler, validation, API calls
6. Frontend: Add Razorpay checkout.js integration
7. QA + suggestions
