# Testing – Lightspeed Wholesale App

This consolidated guide replaces `TESTING_STRATEGY.md` and `E2E_TESTING_GUIDE.md`. It covers the four storefront features: price gating, registration, category banners, and product tags.

## Quick Setup
- Use storefront with the app installed (`clientId: custom-app-121843055-1`).
- Test three user states: guest, logged-in non-wholesale, logged-in wholesale.
- Keep Console + Network tabs open; clear console between flows.
- Ensure categories have image + description; products have TAGS attributes.

## Readiness Checks (Console)
```javascript
console.log("Ecwid exists:", !!window.Ecwid);
Ecwid.OnAPILoaded.add(() => {
  console.log("Store ID:", Ecwid.getOwnerId());
  console.log("Token available:", !!Ecwid.getAppPublicToken("custom-app-121843055-1"));
});
```

## Test Suites

### 1) Price Visibility (Gating)
- Guest: prices/buy buttons/price filters hidden; `#wholesale-hide-css` present.
- Logged-in non-wholesale: same hiding as guest; cart links and account bag/favorites steps hidden; auto-redirect may fire to registration once per session (`wr-autoredirect`).
- Wholesale: prices and buy buttons visible; cart links and account steps restored.

### 2) Registration Banner
- Logged-in non-wholesale: banner visible on non-register pages; hidden on `/products/account/register`.
- Banner click navigates to registration; telemetry in console `[WholesaleTelemetry] wholesale_banner_*`.
- Persistent banners restore on navigation via `sessionStorage` (`wr-banner`).

### 3) Registration Form (Route `/products/account/register`)
- Form injects via hijack of `.ec-cart__body-inner`; MutationObserver keeps it present on SPA redraws.
- Prefill from `Ecwid.Customer.get()`: email (read-only), name, phone, company, postal, country, acceptMarketing.
- Extra field metadata from App Public Config v2 (`extraFields[{key,title,placeholder,type,required,options}]`).
- Country options limited to `US`, `UM`, `VI`.

### 4) Validation
- Required: name, phone, company, ZIP, country, Tax ID when marked required.
- Invalid country shows "Invalid country code"; first invalid field focused.
- Error UI: `.form-control--error`, `.form__msg--error`, `aria-invalid` + `aria-describedby` links.

### 5) Submission Flow (External Registration Server)
- Submit calls `POST {REG_SERVER_URL}/api/register` with Bearer storefront session token + `Idempotency-Key`.
- On success: telemetry `wholesale_registration_success`, Ecwid config refresh, forced `Ecwid.Customer.get()`, persistent success banner (5s). Redirect to `/products` currently commented out (debugging).
- On failure: error message inline, persistent error banner (5s), telemetry `wholesale_registration_failure`.
- Retry handling: server may return 202 + `Retry-After`; client uses idempotency key per request.

### 6) SPA Navigation
- Navigate away and back: form cleans up and reinjects; banner restore runs on `OnPageLoaded`.
- Auto-redirect only once per session (`wr-autoredirect` flag).

### 7) Post-Submission Checks (after server processes)
- Verify customer group assignment via Ecwid UI; wholesale banner disappears, prices visible.
- Session banners should clear after expiration or navigation beyond 5s window.

### 8) Category Banners
- On CATEGORY pages with image + description: `.category-banner` wrapper inserted as first child of `.ecwid-productBrowser-head`; existing `.grid__description` becomes `.category-banner-text` overlay; image from REST `imageUrl/originalImageUrl`.
- CSS/Font from `app.css` and Google Font Cormorant Garamond load once; cleanup removes banner on non-category pages.

### 9) Product Tags
- On PRODUCT pages with TAGS attribute: `.product-details-module__tags` injected below description; links currently hash/alert placeholder.
- No tags rendered when attribute missing/empty.

### 10) Accessibility
- Tab through registration form; all inputs reachable; checkbox toggles with space/enter.
- Screen reader: labels announced; errors announced via `aria-describedby`.

## Regression Checklist (Short)
- Prices hidden correctly for guest/non-wholesale; visible for wholesale.
- Banner shows for non-wholesale and hides on register page.
- Registration form injects, validates, and submits to external server; banners persist across navigation.
- Category banners render only when image + description present; clean up on other pages.
- Product tags render only when TAGS values exist.
- Console free of errors across SPA navigation.
