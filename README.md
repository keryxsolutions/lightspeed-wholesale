# Lightspeed eCom Custom App — Wholesale, Category Banner, Product Tags, Registration

This custom app enhances a Lightspeed (Ecwid) storefront with four integrated features:

- **Wholesale Price Visibility Control** — Hide prices/buy buttons for guests and non-wholesale customers
- **Category Banners** — Full-width image hero banners with description overlays
- **Product Tags** — Display tags from TAGS attributes below product descriptions
- **Wholesale Registration Flow** — Account-based registration form on `/products/account/register`

All functionality runs client-side on the storefront. Uses Ecwid Storefront JS API and REST API with public token; no custom backend required.

## Product Requirements

For detailed specifications, acceptance criteria, and implementation notes, see:

- **[Registration](docs/registration.prd)** — Wholesale registration flow with form prefill and submission
- **[Wholesale Gating](docs/wholesale-gating.prd)** — Price visibility control and customer group detection
- **[Category Banners](docs/category-banners.prd)** — Hero banner rendering with image and text overlays
- **[Product Tags](docs/product-tags.prd)** — Tag display from product attributes with placeholder links

**Master PRD Index:** [docs/index.prd](docs/index.prd) — Overview and cross-cutting concerns

## Files Overview

- `app.js` — Main JavaScript (hosted: https://keryxsolutions.github.io/lightspeed-wholesale/app.js)
- `app.css` — CSS styles (request Lightspeed to add: https://keryxsolutions.github.io/lightspeed-wholesale/app.css)


## Wholesale Gating Architecture

The wholesale price/buy-button gating uses **three layers** (defense-in-depth):

1. **Ecwid storefront config** (primary): `setWholesaleConfig(show)` toggles `ec.storefront.config` properties (`product_list_price_behavior`, `product_list_buybutton_behavior`, etc.) to `HIDE` for guests / `SHOW` for wholesale. Controls Ecwid storefront widgets (product grids, product details). **Initial admin settings are HIDDEN** — app.js reveals for wholesale users.

2. **CSS injection** (fallback): `injectWholesaleHidingCSS()` injects a `<style id="wholesale-hide-css">` block hiding price/buy-button elements. `removeWholesaleHidingCSS()` removes it for wholesale. Catches elements the config doesn't reach.

3. **Price scrubber** (dynamic): `startWholesalePriceScrubber()` observes the DOM and blanks dynamically-rendered prices.

### Instant Site widgets (the gotcha)

The Instant Site's own widgets — Product Collection tiles on the homepage, custom pages — use `ins-` prefixed classes (`ins-tile__product-card`, `ins-control--button`) and **do NOT respect `ec.storefront.config`**. They render independently. The Instant Site editor's Design tab has style entries (colors) for "Product price" and "Buy button" but **no show/hide visibility toggle**.

**To gate a new Instant Site element:**
1. Identify the CSS class (chrome-devtools → inspect the live element on the page).
2. Add the selector to `injectWholesaleHidingCSS()` in `app.js` (comma-separated with existing selectors, scoped to the widget).
3. Show/hide is automatic: guests → hidden (CSS active); wholesale → shown (CSS removed). No other code needed.

Example: `.ins-tile__product-card .ins-control--button` (homepage "Buy Now" buttons on Product Collection tiles).

## Category Banner

### Prerequisites
- Design → Category name position → Select: **Hide category names** (required for banner effect)
- Category must have both an **image** and **description**
- Image recommended: 1920×400px or larger

### Behavior
- On category pages, the script fetches category data via REST and inserts a `.category-banner` wrapper as the first child of `.ecwid-productBrowser-head`
- The category image fills the banner; the existing description becomes the overlay (`.category-banner-text`)
- Fonts and CSS are loaded from `app.css` and Google Fonts (Cormorant Garamond)

### Current Status
- ✅ JS complete in `app.js`
- ⏳ CSS hosted and auto-injected; request Lightspeed to set `customCssUrl` for best performance
- 🔄 Fallback: CSS still injected by JS if the external CSS isn’t added in app config

### Request to Lightspeed Support
Provide to support:
- App ID: [Your App ID]
- Store ID: [Your Store ID]
- Request: Add `customCssUrl` → `https://keryxsolutions.github.io/lightspeed-wholesale/app.css`

### Expected Results
- Full-width banner image (approx. 400px height, responsive)
- Centered text overlay (preserves HTML formatting)
- Hidden default category titles
- Mobile responsive typography

### Troubleshooting
- Banner not appearing: Ensure category has image; verify design setting is “Hide category names”
- Inspect console for “Category Banner” warnings

## Product Tags (from TAGS attribute)

### Prerequisites
- Admin → Product Types → Add attribute:
  - Name: “Tags” (or similar)
  - Type: `TAGS`
  - Display: `DESCR` (visible on storefront)
- Assign tag values on products for testing

### Behavior
- On product pages, the app fetches the product via REST and reads attributes
- If a TAGS attribute exists, it injects a `.product-details-module__tags` block below `.product-details-module__content`
- Renders: `Tags: tag1, tag2, …` with clickable links

### Limitations (current)
- Tag links are placeholders (alert/redirect to search)
- Full tag pages and server-side filtering are not implemented in this app build

### Troubleshooting
- Verify the product has TAGS values
- Check console for “Tag System” warnings

## Wholesale Price Visibility

### Behavior
- Guest users: prices, buy buttons, and price filter are hidden
- Logged-in non-wholesale customers: prices and buy buttons stay hidden
- Logged-in wholesale customers: prices and buy buttons are shown
- The app applies a hidden default first, then updates `ec.storefront.config`, injects/removes a safety CSS tag (`#wholesale-hide-css`), and scrubs PDP price text/metadata with `data-nosnippet` for non-wholesale states

### Notes
- Does not rely on a store UI setting for default price hiding; PDP prices are hidden defensively until wholesale status is confirmed
- Uses Storefront config price flags as defense-in-depth when available
- Works across SPA navigation via `Ecwid.OnPageLoaded`

## Wholesale Registration Flow

### Architecture: External Registration Server

Registration uses a **client-server architecture** where the storefront app handles UI and the external Registration Server handles all Ecwid Admin REST operations.

**Client (Storefront App):**
- Form rendering and validation
- Prefill from `Ecwid.Customer.get()`
- Session token authentication
- Submit to Registration Server

**Server (External):**
- Customer profile updates via Admin REST
- Extra fields persistence
- Immediate customer group assignment
- Idempotent operations

### Features
- Banner prompts logged-in, non-wholesale users to register
- Custom form injects on `/products/account/register` (hijacks account page container)
- Prefills from `Ecwid.Customer.get()`: name, phone, company, postal code, country, email (read-only)
- **Submits to:** `POST {REG_SERVER_URL}/api/register` with session token authentication
- **Server handles:** Profile updates, extra fields, group assignment
- After success, refreshes storefront config to update price visibility

### Implementation Status
✅ **Complete** — External server architecture with full persistence

**Client-Side:**
- ✅ Form injection, prefill, validation
- ✅ Session token authentication
- ✅ POST to Registration Server with idempotency
- ✅ 202 retry handling with `Retry-After`
- ✅ Server error message display
- ✅ Telemetry tracking
- ⚠️ Redirect to `/products` (disabled for debugging)

**Server-Side:**
- ✅ Session token validation
- ✅ Customer profile updates (`billingPerson`, `acceptMarketing`, `taxId`, `contacts`)
- ✅ Extra fields persistence (Tax ID, Cell Phone, referral source)
- ✅ Customer group assignment (wholesale group)
- ✅ Idempotent operations with `Idempotency-Key`

### Configuration
- `window.WHOLESALE_GROUP_NAME` — Wholesale customer group name (default: `"Wholesaler"`)
- `window.WHOLESALE_REG_SERVER_URL` — Registration Server URL (default: `"https://ecwid-registration.keryx-solutions.workers.dev"`)
- Feature flags in `WHOLESALE_FLAGS`:
  - `ENABLE_WHOLESALE_REGISTRATION` — Enable/disable registration feature
  - `ENABLE_WHOLESALE_BANNER` — Show/hide registration prompt banner

### API Contract
**Client → Server:**
```http
POST {REG_SERVER_URL}/api/register
Authorization: Bearer {sessionToken}
Idempotency-Key: {UUID}
Content-Type: application/json

{
  "storeId": "121843055",
  "lang": "en",
  "values": {
    "name": "...",
    "companyName": "...",
    "postalCode": "...",
    "countryCode": "US",
    "phone": "...",
    "cellPhone": "...",
    "taxId": "...",
    "hear": "...",
    "acceptMarketing": true
  }
}
```

**Server → Client (Success):**
```json
{
  "status": "success",
  "customerId": 123456789,
  "groupId": 25614001
}
```

### Telemetry
Console-backed events (see [registration.prd](docs/registration.prd) for details):
- `wholesale_banner_shown`, `wholesale_banner_click`
- `wholesale_registration_view`, `wholesale_registration_submit`
- `wholesale_registration_success`, `wholesale_registration_failure`

### Server Requirements
- **Registration Server** must be deployed and accessible at `REG_SERVER_URL`
- Server must have Ecwid Admin API tokens with required scopes:
  - `read_customers`, `update_customers`, `read_customer_groups`, `read_store_extrafields`
- CORS must allow storefront origin
- See [docs/ECWID-REGISTRATION-API.md](docs/ECWID-REGISTRATION-API.md) for full server specification

## Deployment Checklist
- [ ] Host/update `app.js` on GitHub Pages
- [ ] Host/update `app.css` on GitHub Pages
- [ ] Ask Lightspeed support to set `customCssUrl` to `app.css`
- [ ] Set “Hide category names” in design settings
- [ ] Ensure categories have image + description
- [ ] Add TAGS attribute to Product Types and assign tags on test products
- [ ] Ensure the app public token grants customers read/write, customer groups read, and customer extra fields read/write
- [ ] (Optional) Set window.WHOLESALE_GROUP_NAME if your group name differs from the default
- [ ] Test on category and product pages

## Testing
- See `TESTING.md` for consolidated validation of banner, tags, wholesale visibility, and registration flow.
- Status and registration actions run via Ecwid REST using the public token.

## Development Notes
- SPA-aware via `Ecwid.OnPageLoaded`
- Uses `Ecwid.getOwnerId()` and `Ecwid.getAppPublicToken(clientId)` to call REST securely on the storefront
- Defensive DOM lookups and idempotent injection for stability
- Error logging prefixed with “Category Banner”, “Tag System”, and “Wholesale Reg” for quick triage
