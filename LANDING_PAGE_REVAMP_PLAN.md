# RR Fashion — Landing Page Revamp Plan

**Reference design**: https://modavenextjs.vercel.app/home-fashion-modernRetreat
**Status**: Approved by user · ready for phased implementation
**Last updated**: 2026-07-09

This document is the planning deliverable produced by the `suggestion-research-agent` after cross-validating the user's draft plan against the live Modave reference and the existing rrFashion codebase. All 28 items are mapped to existing files, prioritized by impact × effort, and confirmed against Indian-market requirements.

---

## A. Reference Audit (Modave ModernRetreat)

Top-to-bottom the Modave homepage has the following sections, in order:

| # | Section | Pattern | rrFashion present? |
|---|---------|---------|--------------------|
| 1 | Pre-header announcement bar | Thin black bar with rotating trust messages | ❌ Not implemented |
| 2 | Sticky main header with mega-menu, search, login, wishlist, cart (count badge) | Standard e-com | ✅ Header.tsx |
| 3 | Hero slider (1 large editorial slide, eyebrow + headline + CTA) | ✅ HeroSlider | |
| 4 | Editorial "Discover Women's" secondary promo banner | ❌ Missing | |
| 5 | Featured products row (4 product cards) | ✅ Implemented | |
| 6 | In-grid promo tile ("Super Sale Up To 50% / Shop Now") | ❌ Missing | |
| 7 | Lookbook strip with shoppable pins | ✅ Lookbook.tsx | |
| 8 | "Shop our top picks" promotional banner | ❌ Missing | |
| 9 | Testimonials carousel with product thumbnail + price | 🟡 Missing thumbnail & price | |
| 10 | 6-tile shoppable image gallery (Promotion / Accessories / New in / New Arrival) | ❌ Missing | |
| 11 | Trust bar (14-Day Returns, Free Shipping, 24/7 Support, Member Discounts) | ✅ Footer.tsx (wrong location) | |
| 12 | Newsletter with "10% OFF first order" | ✅ Already done | |
| 13 | Footer with store address + "GET DIRECTION" + payment icons | 🟡 Placeholder address | |
| 14 | Cart drawer (slide-in from right) | 🟡 Currently toast | |
| 15 | Quick View slide-in panel | ✅ QuickViewModal.tsx | |
| 16 | Compare drawer | ✅ CompareDrawer.tsx | |
| 17 | Search overlay (full-screen w/ Featured keywords + Recently viewed) | ✅ ProductSearchModal.tsx | |

**Patterns the original draft missed:**
1. Pre-header announcement bar (rotating trust messages).
2. In-grid promotional tile (full-bleed banner mid-grid).
3. Sticky add-to-cart slide-in drawer.
4. Trust bar **above** newsletter (not at footer bottom).
5. Featured keywords list in search modal.

---

## B. Codebase Cross-Reference

### Section 0 — Critical Bugs

| Draft item | Status | Location |
|---|---|---|
| Kurti Collection: only 1 card + huge gray block | ❌ **Real bug** | `pages/Home/components/ProductCollection.tsx:106` — `flex justify-center gap-[28px] max-w-[1360px] mx-auto` with hard-coded 4 slots; on `isActive=false` filtered sets, only 1–2 cards render and the flex container keeps its 1360px reserved space (the "gray block" is `bg-white` margin). |
| Saree: 1 full-bleed image card | ❌ **Real bug** | Same `ProductCollection.tsx` — if API returns 1 product, it fills the row. `flex` doesn't responsively collapse. |
| 3 different grid implementations | ✅ **Confirmed** | `pages/Shop/components/ProductGrid.tsx` (responsive grid ✅), `pages/Home/components/ProductCollection.tsx` (flex-4 ❌), `pages/Home/components/FeaturedProducts.tsx` (dead code, never imported). |

### Section 1 — Header / Navigation

| Draft item | Status | Location |
|---|---|---|
| Add wishlist icon | ✅ **Already done** | `Header.tsx:183-196` |
| Cart item-count badge | ✅ **Already done** | `Header.tsx:199-212` |
| Improve Jewellery dropdown styling | 🟡 Partially | `Header.tsx:147-163` — generic mega menu, no per-category accent |
| Keep INR/EN | ✅ | `Header.tsx:265-318` — INR + EN/Hindi/Gujarati (3 langs) |

### Section 2 — Hero Banner

| Draft item | Status | Location |
|---|---|---|
| Reduce visual clutter, trim font-weight, add eyebrow | ✅ **Already done** | `pages/Home/components/HeroBanner.tsx:5-40` |
| Make carousel arrows subtle/ghost | ✅ Done | `pages/Home/components/HeroSlider.tsx` |

### Section 3 — Category Circles

| Draft item | Status | Location |
|---|---|---|
| Keep — appropriate for Indian market | ✅ | `CategoryCards.tsx:60` — `w-[151px] h-[151px] rounded-full` |
| Consistent sizing + hover scale/shadow | 🟡 Sizing consistent, no hover scale | `CategoryCards.tsx:54-78` |

### Section 4 — Product Collection Sections

| Draft item | Status | Location |
|---|---|---|
| Hover image swap | ✅ **Done** | `ProductCard.tsx:208-219` |
| Wishlist / Compare / Quick View icon row on hover | ✅ **Done** | `ProductCard.tsx:222-231` + `QuickActions.tsx` |
| Color swatches under title | ✅ **Done** | `ProductCard.tsx:254-258` + `ColorSwatches.tsx` |
| Strikethrough MRP + sale price + -X% badge | ✅ **Done** | `ProductCard.tsx:282-291` + `ProductBadge.tsx:21-25` |
| "ADD TO CART" hover-reveal (optional) | 🟡 Always visible | `ProductCard.tsx:294-304` |
| Standardize section header (title + "See all →") | ✅ Done | `ProductCollection.tsx:96-105` |
| In-grid promo banner tile | ❌ Missing | — |

### Section 5 — Shop The Look (Lifestyle)

| Draft item | Status | Location |
|---|---|---|
| Hover overlay with "Shop Now" CTA per tile | 🟡 Has pins w/ tooltip | `Lookbook.tsx:64-101` |
| Consistent image aspect ratio | ✅ | `Lookbook.tsx:105` — `aspect-[3/4]` |

### Section 6 — Testimonials

| Draft item | Status | Location |
|---|---|---|
| Add product thumbnail + price | ❌ **Missing** | `Testimonials.tsx:139-143` |
| Carousel navigation if > 3 testimonials | 🟡 Present | `Testimonials.tsx:150-161` |

### Section 7 — Image Gallery / Category Tiles

| Draft item | Status | Location |
|---|---|---|
| 6-tile masonry shoppable gallery | ❌ **Missing** | No such component anywhere |

### Section 8 — Newsletter

| Draft item | Status | Location |
|---|---|---|
| "10% off" incentive line | ✅ **Done** | `Newsletter.tsx:39` |

### Section 9 — Features / Trust Bar

| Draft item | Status | Location |
|---|---|---|
| Optional scrolling marquee strip | 🟡 Static grid | `Footer.tsx:79-108` |

### Section 10 — Footer

| Draft item | Status | Location |
|---|---|---|
| Payment icons row | ✅ Done — but **broken image references** for UPI/Razorpay | `Footer.tsx:272-302` (inline SVG ✅) but `CartSummary.tsx:158-161` and `CheckoutForm.tsx:526-528` reference `/images/payments/upi.svg` and `/images/payments/razorpay.svg` which **do not exist** in `public/images/payments/` |
| Store address / "Get Directions" | 🟡 Has New York placeholder | `Footer.tsx:189-192` |
| Verify "Useful Links" column renders | 🟡 Renders but `comingSoon: true` | `Footer.tsx:63-71` |

### Section 11 — General / Cross-Cutting

| Draft item | Status | Location |
|---|---|---|
| Spacing & vertical rhythm (80–100px) | ✅ Defined | `styles/globals.css:80-90` (`.page-section = mb-[80px]`, `.page-section-alt` exists but unused) |
| ProductCard consolidation | 🟡 Card is consolidated; consumers aren't | `ProductCollection.tsx`, `ProductGrid.tsx`, `FeaturedProducts.tsx`, `RecentlyViewed.tsx` each wrap differently |
| Hover micro-interactions | ✅ | `ProductCard.tsx:163-167` |
| Mobile check | 🟡 | `MobileBottomNav.tsx` exists; `ProductCollection.tsx` flex-4 will overflow on mobile (root of the P0 bug) |

---

## C. New Suggestions (original draft missed)

### C1. Announcement Bar (pre-header)
Modave uses a thin black bar above the header. For rrFashion (India): **"Free shipping above ₹999 ✦ COD available ✦ Use code FIRST10 for 10% off"** with a close (×) button. Persist dismissal in `localStorage`. **File**: new `components/layout/AnnouncementBar.tsx`.

### C2. In-Grid Promotional Tiles
- Inside "Kurti Collection" row, after card 2: 2-col-wide tile promoting "Super Sale up to 50% on Kurtis".
- Between "Saree Collection" and "Featured Collection": full-width editorial banner ("Shop our top picks — Reserved for special occasions").

### C3. Add-to-Cart Slide-In Drawer (Mini-Cart)
Modave shows a slide-in cart drawer from the right when an item is added. Currently we use a `toast` (see `ProductCard.tsx:144`, `QuickActions.tsx`). Build a `MiniCart` drawer: slide-in from right, last-added item thumbnail, qty controls, subtotal, "View Cart" + "Checkout" buttons, free-shipping progress bar. **File**: new `components/common/MiniCart.tsx`, add `openMiniCart` to `store/uiStore.ts`.

### C4. Sticky "Trust Bar → Newsletter" Reorder
Move the 4 trust icons (currently at `Footer.tsx:79-108`) to a new `components/common/TrustBar.tsx` placed in `Home/index.tsx` *after* `Testimonials` and *before* `Newsletter`.

### C5. WhatsApp / Click-to-Chat CTA
Indian e-commerce sites have a floating WhatsApp "Chat with us" button. Recommended:
- Floating button bottom-right (above MobileBottomNav on mobile).
- Links to `https://wa.me/919725408903?text=Hi%20RR%20Fashion`.
- Hidden on `/checkout` and `/pos` routes.
**File**: new `components/common/WhatsAppButton.tsx` + add to `Layout.tsx`.

### C6. PWA Install Nudge
Indian mobile-first shoppers benefit from install-to-homescreen. Add `beforeinstallprompt` listener: small toast after 30s of dwell time. **File**: new `components/common/PWAInstallPrompt.tsx` + `public/manifest.webmanifest` (currently missing) + `vite-plugin-pwa` plugin.

### C7. Image Quality / Loading Strategy
- Skip secondary `<img>` render if `images.length < 2` in `ProductCard.tsx`.
- Add `sizes` attribute to ProductCard images.
- Add `fetchpriority="high"` and preload LCP image in `HeroBanner.tsx`.
- Add `decoding="async"`.

### C8. Currency Switcher Cleanup
Header has `INR` / `USD` / `EUR` options (`Header.tsx:280-287`) but USD/EUR are placeholders with no conversion. **Decision: remove USD/EUR — INR-only.**

### C9. Free-Shipping Threshold Reuse
`Cart.tsx:18` hardcodes `FREE_SHIPPING_THRESHOLD = 5000`. Inconsistent with `DesignSystemShowcase.tsx:138` ("₹999") and current product range. **Decision: ₹999**. Move to shared `utils/constants.ts`; extract progress-bar UI from `Cart.tsx:78-95` into `components/common/FreeShippingBar.tsx`.

### C10. Page-Section Backgrounds & Rhythm
Modave alternates `bg-white` and `bg-[#f8f8f8]`. rrFashion has `.page-section-alt` (gray-50) defined but unused. Apply to Testimonials and Newsletter.

### C11. Accessibility (a11y) Quick Wins
- All Swiper instances need `aria-label` on `nextEl`/`prevEl` (some are missing).
- Color swatch buttons need `aria-pressed={index === selectedIndex}`.
- `Newsletter.tsx:42` form has no `aria-describedby`.
- Add `role="region"` + `aria-label` to every `<section>` in `Home/index.tsx`.

### C12. Wishlist Persistence Bug
**Two wishlist stores exist**: `hooks/useWishlist` (Zustand wrapper) and `store/wishlistStore`. Both Header and MobileBottomNav reading different stores is a sync bug. Consolidate.

### C13. Festive / Diwali Promo Tile
Configurable promo tile for festive seasons (Oct–Nov). Time-bounded with `startDate`/`endDate`. Code-driven config in `utils/constants.ts`:
```
PROMO_BANNER = { enabled: true, code: 'SHINE20', discount: 20, endDate: '2026-11-15' }
```

### C14. Empty-State Copy
`ProductCollection.tsx:84-86` shows generic "No products available". For India launch, change to category-specific copy.

### C15. Performance: TanStack Query Caching
`STALE_TIMES` in `constants.ts:151-163` has 5-min stale for products — too long for a new launch. Shorten to 2 min for `products` and `saleProducts`.

---

## D. Final Prioritized Backlog

### P0 — Blocking bugs (1 day, ~5h)

| # | Title | Impact | Effort | Risk | Files |
|---|---|---|---|---|---|
| P0-1 | Fix ProductCollection layout bug | 5 | S (1h) | Low | `pages/Home/components/ProductCollection.tsx`, delete `FeaturedProducts.tsx` |
| P0-2 | Add missing UPI/Razorpay/Visa/MC SVGs | 4 | S (1h) | Low | new `public/images/payments/*.svg` |
| P0-3 | Update Footer payment icons to include UPI + Razorpay | 4 | S (30m) | Low | `components/layout/Footer.tsx:272-302` |
| P0-4 | Update Footer address to "Shipping from Surat, Gujarat" | 3 | XS (15m) | Low | `components/layout/Footer.tsx:189-192` |
| P0-5 | Make Footer Useful Links routable | 3 | S (1h) | Low | `components/layout/Footer.tsx:63-71` |
| P0-6 | Fix `$150` → `₹999` in Footer | 3 | XS (5m) | Low | `components/layout/Footer.tsx:85` |
| P0-7 | Remove USD/EUR from currency switcher (INR-only) | 2 | XS (30m) | Low | `components/layout/Header.tsx:264-290` |
| P0-8 | Centralize `FREE_SHIPPING_THRESHOLD = 999` | 4 | XS (30m) | Low | `utils/constants.ts`, `Cart.tsx:18`, `DesignSystemShowcase.tsx` |

### P1 — Component polish (3 days, ~22h)

| # | Title | Impact | Effort | Risk | Files |
|---|---|---|---|---|---|
| P1-1 | Consolidate to one ProductGrid (delete FeaturedProducts) | 3 | S (1h) | Low | delete `FeaturedProducts.tsx`; `ProductCollection.tsx` becomes canonical |
| P1-2 | Add 6-tile shoppable Image Gallery | 4 | M (4h) | Low | new `pages/Home/components/ImageGallery.tsx`; `Home/index.tsx:29-30` |
| P1-3 | Add product thumbnail + price + link to Testimonials | 3 | S (2h) | Low | `pages/Home/components/Testimonials.tsx:135-144` |
| P1-4 | Move TrustBar above Newsletter (extract from Footer) | 3 | M (3h) | Low | new `components/common/TrustBar.tsx`; `Home/index.tsx` |
| P1-5 | Extract `FreeShippingBar` shared component | 4 | M (3h) | Med | new `components/common/FreeShippingBar.tsx`; refactor `Cart.tsx:78-95` |
| P1-6 | Hover scale + shadow on CategoryCards | 2 | XS (30m) | Low | `pages/Home/components/CategoryCards.tsx:54-78` |
| P1-7 | Apply `.page-section-alt` for visual rhythm | 2 | XS (15m) | Low | `pages/Home/index.tsx` |
| P1-8 | Lookbook "Shop Now" full-tile hover overlay | 3 | S (2h) | Low | `pages/Home/components/Lookbook.tsx:103-124` |
| P1-9 | In-grid promo tiles in ProductCollection | 3 | M (4h) | Low | extend `ProductCollection.tsx`; new `PromoTile.tsx` |
| P1-10 | Image optimization (sizes, fetchpriority, conditional secondary) | 3 | S (2h) | Low | `ProductCard.tsx:202-219`; `HeroBanner.tsx` |

### P2 — Conversion features (5 days, ~30h)

| # | Title | Impact | Effort | Risk | Files |
|---|---|---|---|---|---|
| P2-1 | Mini-cart slide-in drawer | 5 | L (6-8h) | Med | new `components/common/MiniCart.tsx`; `store/uiStore.ts` |
| P2-2 | WhatsApp floating CTA (919725408903) | 4 | S (2h) | Low | new `components/common/WhatsAppButton.tsx`; `Layout.tsx` |
| P2-3 | PWA install nudge | 3 | M (4h) | Low | new `PWAInstallPrompt.tsx`; `manifest.webmanifest`; `vite.config.ts` |
| P2-4 | Announcement bar (pre-header) | 4 | M (4h) | Low | new `components/layout/AnnouncementBar.tsx`; `Layout.tsx` |
| P2-5 | Festive/Diwali promo banner (configurable) | 3 | M (3h) | Low | new `components/common/PromoBanner.tsx`; feature flag in `utils/constants.ts` |
| P2-6 | A11y: aria-labels, roles, focus management | 3 | M (3h) | Low | multiple — Testimonials Swiper, ProductCard swatches, Newsletter form, sections |
| P2-7 | Wishlist store consolidation (fix two-store bug) | 2 | S (1h) | Med | `hooks/useWishlist.ts` vs `store/wishlistStore.ts` |
| P2-8 | Festive/Indian copy pass (testimonials, lookbook, trust bar) | 3 | S (2h) | Low | `Testimonials.tsx`, `Lookbook.tsx`, `Footer.tsx` |
| P2-9 | Indian size chart data for SizeGuide.tsx | 3 | S (2h) | Low | `components/common/SizeGuide.tsx` |
| P2-10 | Add GSTIN line to Footer | 2 | XS (15m) | Low | `components/layout/Footer.tsx` |

### P3 — Polish & A/B (deferred)

| # | Title | Impact | Effort | Risk | Files |
|---|---|---|---|---|---|
| P3-1 | Scrolling marquee trust strip | 2 | M (3h) | Low | replace static `TrustBar` w/ marquee |
| P3-2 | Exit-intent popup with 10% off | 3 | M (4h) | Med | new `components/common/ExitIntentPopup.tsx` |
| P3-3 | Countdown timer for next sale | 2 | S (2h) | Low | new `SaleCountdown.tsx`; use existing `DealTimer.tsx` |
| P3-4 | Featured keywords list in Search modal | 2 | S (2h) | Low | `components/layout/ProductSearchModal.tsx` |
| P3-5 | A/B test "See all →" vs "View all" copy | 1 | M (3h) | Low | `ProductCollection.tsx:99-104` |

---

## E. Risks & India-Market Considerations

### Already handled correctly
- ✅ INR formatting (`utils/formatCurrency.ts:11` — `en-IN` locale for lakh/crore grouping).
- ✅ Razorpay integration (`CheckoutForm.tsx:46, 80, 241-291`).
- ✅ UPI/COD support (`paymentMethod: 'razorpay' | 'cod'`, line 80).
- ✅ Hindi + Gujarati language options.
- ✅ Guest checkout at `/checkout/guest` (`routes/index.tsx:18`).
- ✅ Mobile bottom nav with safe-area-inset-bottom.

### Risks / Gaps

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | Payment icon images 404 (UPI, Razorpay, Visa, MC) | **High** | P0-2: commit official SVGs to `public/images/payments/` |
| 2 | Trust messaging is `$150`, not `₹` | Medium | P0-6: fix Footer.tsx:85 |
| 3 | Testimonial copy is US-centric (Sarah Johnson, Michael Chen) | Medium | P2-8: change to Indian names + festival context |
| 4 | Phone number placeholder `+1 (123) 456-7890` | Medium | Replace with `+91 9725408903` (or remove if not using) |
| 5 | Empty Lookbook data is hardcoded English | Low | P2-8: "Festive Edit", "Sangeet Ready", "Wedding Guest" |
| 6 | Stale ₹5000 free-shipping threshold | Medium | P0-8: change to ₹999, centralize in `utils/constants.ts` |
| 7 | No GST / invoice messaging | Medium | P2-10: add GSTIN in Footer |
| 8 | No Indian size chart (bust + length in inches) | Medium | P2-9: populate `SizeGuide.tsx` with Indian cuts |
| 9 | No COD badge on product cards | Low | Add "COD Available" pill in product card |
| 10 | No real reviews on ProductCard (mock data) | Low | Wire to real `/api/reviews` API |
| 11 | "Member Discounts" trust icon with no loyalty program | Medium | Implement basic tier or remove icon |
| 12 | No "Cash on Delivery" trust icon | Low | Add to trust bar (P1-4) |
| 13 | Hero images are Unsplash CDN | Low | Mark for content team — replace with brand photography |
| 14 | No "100% Authentic" trust mark | Low | Add to trust bar (P1-4) |
| 15 | Two wishlist stores (sync bug) | Medium | P2-7: consolidate |

---

## F. Implementation Phasing

### Phase 1 — Quick wins & bug fixes (1 day, ~5h)
- P0-1: Fix ProductCollection flex→grid bug (1h)
- P0-2: Source + commit 4 payment SVGs (1h)
- P0-3: Update Footer payment icons (30m)
- P0-4: Footer address → "Shipping from Surat, Gujarat" (15m)
- P0-5: Useful Links routable (1h)
- P0-6: Fix `$150` → `₹999` in Footer (5m)
- P0-7: Remove USD/EUR from currency switcher (30m)
- P0-8: Centralize `FREE_SHIPPING_THRESHOLD = 999` (30m)
- P1-6: Hover scale on CategoryCards (30m)
- P1-7: Apply `.page-section-alt` rhythm (15m)

**Total: ~5h / 1 working day**

### Phase 2 — Component polish & new section (3 days, ~22h)
- P1-1: Consolidate ProductGrid (1h)
- P1-2: 6-tile Image Gallery (4h)
- P1-3: Testimonials product thumbnail + price (2h)
- P1-4: TrustBar extracted + moved above Newsletter (3h)
- P1-5: Free-shipping bar extraction + ₹999 constant (3h)
- P1-8: Lookbook "Shop Now" overlay (2h)
- P1-9: In-grid promo tiles (4h)
- P1-10: Image optimization (2h)
- P1-11: Festive/Indian copy pass (S 2h — overlap with P2-8)

**Total: ~22h / 3 days**

### Phase 3 — Conversion features (5 days, ~30h)
- P2-1: Mini-cart slide-in drawer (6-8h)
- P2-2: WhatsApp floating CTA (2h)
- P2-3: PWA install nudge (4h)
- P2-4: Announcement bar (4h)
- P2-5: Festive/Diwali promo banner (3h)
- P2-6: A11y polish (3h)
- P2-7: Wishlist store consolidation (1h)
- P2-8: Festive/Indian copy pass (2h)
- P2-9: Indian size chart data (2h)
- P2-10: Add GSTIN line to Footer (15m)

**Total: ~28h / 4 days**

---

## G. Backend Work Required (CMS data)

Per user decision: Testimonials + Lookbook are placeholders, replace with real CMS data before launch.

**Backend endpoints needed:**
- `GET /api/reviews?featured=true&limit=10` — `{ rating, body, customerName, productId, createdAt, isVerified }`
- `GET /api/lookbook?featured=true` — `{ image, title, linkType: 'product' | 'category', linkId: string, sortOrder }`
- `POST /api/admin/reviews` (admin CRUD)
- `POST /api/admin/lookbook` (admin CRUD)

**Database tables:**
- `reviews` — id, productId, customerName, rating, body, isFeatured, isVerified, createdAt
- `lookbook_tiles` — id, image, title, linkType, linkId, sortOrder, isActive, startDate, endDate

---

## H. Confirmed Config Values (centralize in `utils/constants.ts`)

```ts
export const FREE_SHIPPING_THRESHOLD = 999;

export const WHATSAPP_NUMBER = '919725408903';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi RR Fashion')}`;

export const FESTIVAL_PROMOS = {
  diwali: { enabled: true, code: 'SHINE20', discount: 20, startDate: '2026-10-15', endDate: '2026-11-15' },
  navratri: { enabled: true, code: 'GARBA15', discount: 15, startDate: '2026-09-25', endDate: '2026-10-05' },
  wedding: { enabled: true, code: 'WEDDING10', discount: 10, startDate: '2026-11-01', endDate: '2027-02-28' },
  holi: { enabled: true, code: 'HOLI15', discount: 15, startDate: '2027-03-01', endDate: '2027-03-15' },
};

export const CURRENCY_OPTIONS = ['INR'] as const; // removed USD/EUR
```

---

## I. Quick-win Top 5 (start here, <2h)

1. **Fix `ProductCollection.tsx:106`** — replace `flex justify-center gap-[28px]` with a responsive grid. **5 min**, fixes Kurti + Saree bugs in one stroke.
2. **Commit 4 SVG icons to `public/images/payments/`** — UPI, Razorpay, Visa, Mastercard. **1h**, fixes broken images on Cart + Checkout + Footer.
3. **Replace Footer's "New York" address** with "Shipping from Surat, Gujarat". **15 min.**
4. **Update `Cart.tsx:18`** to use `FREE_SHIPPING_THRESHOLD = 999` and put the constant in `utils/constants.ts`. **15 min.**
5. **Delete the unused `FeaturedProducts.tsx`** (dead code, never imported). **2 min**, removes 39 lines of confusion.

---

## J. Total Estimate

- **Phase 1** (P0): 1 day · ~5h
- **Phase 2** (P1): 3 days · ~22h
- **Phase 3** (P2): 4 days · ~28h
- **P3 polish**: 1-2 days · ~14h (optional, deferred)
- **Backend CMS work**: 2-3 days (parallel to frontend)

**Grand total: ~70 hours / 10 working days for full P0+P1+P2 implementation, plus 2-3 days backend work in parallel.**

---

**End of report.** This is the planning deliverable. Implementation begins with P0-1 (ProductCollection.tsx:106 flex→grid fix).
