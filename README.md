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

**Master PRD Index:** [docs/wholesale-registration-master.prd](docs/wholesale-registration-master.prd) — Overview and cross-cutting concerns

## Files Overview

- `app.js` — Main JavaScript (hosted: https://keryxsolutions.github.io/lightspeed-wholesale/app.js)
- `app.css` — CSS styles (request Lightspeed to add: https://keryxsolutions.github.io/lightspeed-wholesale/app.css)


## Category Banner

### Prerequisites
- Design → Category name position → Select: **Hide category names** (required for banner effect)
- Category must have both an **image** and **description**
- Image recommended: 1920×400px or larger

### Behavior
- On category pages, the script fetches category data via REST and inserts a `.category-banner` wrapper inside `.ecwid-productBrowser-head`
- The category image fills the banner; the existing description becomes the overlay (`.category-banner-text`)
- Fonts and CSS are loaded from `app.css` and Google Fonts

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
- Logged-in customers: prices and buy buttons are shown
- The app updates `ec.storefront.config` and injects/removes a safety CSS tag (`#wholesale-hide-css`)

### Notes
- Assumes product prices are turned OFF by default in design settings
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
- See `TESTING_STRATEGY.md` for step-by-step validation of banner, tags, wholesale visibility, and registration flow.
- Status and registration actions run via Ecwid REST using the public token.

## Development Notes
- SPA-aware via `Ecwid.OnPageLoaded`
- Uses `Ecwid.getOwnerId()` and `Ecwid.getAppPublicToken(clientId)` to call REST securely on the storefront
- Defensive DOM lookups and idempotent injection for stability
- Error logging prefixed with “Category Banner”, “Tag System”, and “Wholesale Reg” for quick triage