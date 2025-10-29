# Lightspeed eCom Custom App — Wholesale, Category Banner, Product Tags, Registration

This custom app enhances a Lightspeed (Ecwid) storefront with:

- Wholesale price visibility control (hide for guests, show for logged-in)
- Category banner with text overlay (full-width image + description overlay)
- Product tag display from product attributes (TAGS)
- Wholesale registration flow (banner + /wholesale-registration page shell)

All functionality runs on the storefront. Category images and product attributes are fetched via Ecwid REST using the app public token resolved at runtime. The wholesale registration flow optionally calls your backend if configured.

## Files Overview

- `app.js` — Main JavaScript (hosted: https://keryxsolutions.github.io/lightspeed-wholesale/app.js)
- `app.css` — CSS styles (request Lightspeed to add: https://keryxsolutions.github.io/lightspeed-wholesale/app.css)
- `index.html` — Local test interface for API functions

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

## Wholesale Registration Flow (optional backend)

### Features
- A sticky banner prompts guests and non-approved users to register
- Visiting `/wholesale-registration` renders a page shell with a form
- On submit, the app posts to your backend and then checks approval status

### Backend Contract
Configure a backend and expose:
- `GET  /api/wholesale/status?customerId=...&storeId=...` → `{ isWholesaleApproved: boolean }`
- `POST /api/wholesale/register` with JSON body containing: `customerId, email, name, companyName, countryCode, postalCode, phone, cellPhone, taxId, referralSource, acceptMarketing, storeId`

Expose the base URL before the script runs:

```html
<script>
  window.WHOLESALE_API_BASE = "https://your-backend.example.com";
</script>
<script src="https://keryxsolutions.github.io/lightspeed-wholesale/app.js"></script>
```

Without a backend, the banner and page shell still render, but submission won’t complete.

## Deployment Checklist
- [ ] Host/update `app.js` on GitHub Pages
- [ ] Host/update `app.css` on GitHub Pages
- [ ] Ask Lightspeed support to set `customCssUrl` to `app.css`
- [ ] Set “Hide category names” in design settings
- [ ] Ensure categories have image + description
- [ ] Add TAGS attribute to Product Types and assign tags on test products
- [ ] (Optional) Configure backend and set `window.WHOLESALE_API_BASE`
- [ ] Test on category and product pages

## Testing
- See `TESTING_STRATEGY.md` for step-by-step validation of banner, tags, wholesale visibility, and registration flow
- Use `index.html` for local API tests as needed

## Development Notes
- SPA-aware via `Ecwid.OnPageLoaded`
- Uses `Ecwid.getOwnerId()` and `Ecwid.getAppPublicToken(clientId)` to call REST securely on the storefront
- Defensive DOM lookups and idempotent injection for stability
- Error logging prefixed with “Category Banner”, “Tag System”, and “Wholesale Reg” for quick triage