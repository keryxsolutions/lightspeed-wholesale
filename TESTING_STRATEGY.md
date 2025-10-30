# Testing Strategy – Lightspeed eCom Wholesale App (Storefront)

This guide validates the current app.js implementation across five areas:

- Product tag display (from TAGS attribute via REST)
- Category banner (full-width image with description overlay)
- Wholesale price visibility (hide for guests, show for logged-in)
- Wholesale registration flow (banner + /wholesale-registration page shell)
- Telemetry

Run the quick console checks below on your live store. All snippets are intended for the browser console with the app installed.

## Prerequisites

- Design setting: Hide category names (for the banner effect)
- Categories: Have an image and description
- Product Types: TAGS attribute with values on test products
- App installed and loaded (clientId: custom-app-121843055-1)
- (Optional) Set window.WHOLESALE_GROUP_NAME if your wholesale group name differs

## Phase 0: Ecwid API readiness

```javascript
// Verify storefront API objects
console.log("Ecwid exists:", !!window.Ecwid);
console.log("OnAPILoaded:", typeof Ecwid.OnAPILoaded !== 'undefined');
console.log("OnPageLoaded:", typeof Ecwid.OnPageLoaded !== 'undefined');

// Get storeId and app public token without printing token value
Ecwid.OnAPILoaded.add(function() {
  try {
    const storeId = Ecwid.getOwnerId();
    const token = Ecwid.getAppPublicToken("custom-app-121843055-1");
    console.log("Store ID:", storeId);
    console.log("Public token available:", !!token);
    // Do not log token contents for security
  } catch (e) { console.warn("Token resolution failed", e); }
});
```

## Phase 1: Category banner

Expected behavior on category pages:

- A banner wrapper `.category-banner` is inserted inside `.ecwid-productBrowser-head`.
- The category image (from REST API) fills the banner.
- The existing description element becomes the overlay (`.category-banner-text`).

Steps:

```javascript
// Navigate to a category page and run:
Ecwid.OnPageLoaded.add(function(page) {
  if (page.type === 'CATEGORY') {
    setTimeout(() => {
      console.log("Banner wrapper:", document.querySelector('.category-banner'));
      console.log("Overlay element:", document.querySelector('.category-banner-text'));
    }, 1200);
  }
});
```

If the banner does not appear, verify REST access and image presence:

```javascript
Ecwid.OnAPILoaded.add(async function() {
  const last = Ecwid.getLastLoadedPage?.();
  if (last?.type === 'CATEGORY') {
    const storeId = Ecwid.getOwnerId();
    const token = Ecwid.getAppPublicToken("custom-app-121843055-1");
    const r = await fetch(`https://app.ecwid.com/api/v3/${storeId}/categories/${last.categoryId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    console.log("Category API:", { imageUrl: data.imageUrl, originalImageUrl: data.originalImageUrl });
  }
});
```

## Phase 2: Product tag display

Expected behavior on product pages with a TAGS attribute:

- A block `.product-details-module__tags` appears below `.product-details-module__content`.
- It renders: `Tags: tag1, tag2, ...` with clickable links (currently alert/redirect placeholder).

Steps:

```javascript
// Visit a product that has TAGS values, then run:
Ecwid.OnPageLoaded.add(function(page) {
  if (page.type === 'PRODUCT') {
    setTimeout(() => {
      const tagsBlock = document.querySelector('.product-details-module__tags');
      console.log("Tags block:", tagsBlock);
    }, 1500);
  }
});
```

Validate REST attributes for the current product:

```javascript
Ecwid.OnAPILoaded.add(async function() {
  const page = Ecwid.getLastLoadedPage?.();
  if (page?.type === 'PRODUCT' && page.productId) {
    const storeId = Ecwid.getOwnerId();
    const token = Ecwid.getAppPublicToken("custom-app-121843055-1");
    const r = await fetch(`https://app.ecwid.com/api/v3/${storeId}/products/${page.productId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    const tagAttrs = (data.attributes || []).filter(a => a.type === 'TAGS' || a.name?.toLowerCase().includes('tag'));
    console.log("Product tag attributes:", tagAttrs);
  }
});
```

## Phase 3: Wholesale price visibility

Expected behavior:

- Guest users: prices, buy buttons, and price filter are hidden. A style tag with id `wholesale-hide-css` may be present.
- Logged-in users: prices and buy buttons show; the hiding style is removed and storefront config is refreshed.

Checks:

```javascript
// As a guest:
console.log("Hiding CSS present:", !!document.getElementById('wholesale-hide-css'));
console.log("Price nodes visible?", !!document.querySelector('.ecwid-productBrowser-price'));

// After login:
// Navigate or trigger a page load and recheck
setTimeout(() => {
  console.log("Hiding CSS present (should be false if logged in):", !!document.getElementById('wholesale-hide-css'));
}, 1500);
```

## Phase 4: Wholesale registration flow via Ecwid REST

```javascript
// javascript
// 1) Banner visibility (guest or non-approved)
setTimeout(() => {
  console.log("Banner node:", document.getElementById('wholesale-registration-banner'));
}, 1000);

// 2) Navigate to /wholesale-registration
// Expect: #wholesale-registration-root exists; prices force-hidden on this route

// 3) Status check (logged-in)
Ecwid.OnAPILoaded.add(async function () {
  const c = await new Promise(r => Ecwid.Customer.get(r));
  if (c?.id) {
    const status = await ecwidGetWholesaleStatus(c.id).catch(e => (console.warn("Status error", e), null));
    console.log("Wholesale status:", status);
  }
});

// 4) Submit (simulated) — requires being logged in
// Populate fields appropriately before running this in console:
Ecwid.OnAPILoaded.add(async function () {
  const c = await new Promise(r => Ecwid.Customer.get(r));
  if (!c?.id) return console.warn("Login required");
  const res = await ecwidSubmitWholesaleRegistration({
    customerId: c.id,
    email: c.email,
    name: "Jane Doe",
    companyName: "Acme Co",
    countryCode: "US",
    postalCode: "94016",
    phone: "+1 555-555-5555",
    cellPhone: "+1 555-222-3333",
    taxId: "12-3456789",
    referralSource: "Search Engine",
    acceptMarketing: true
  }).catch(e => (console.warn("Submit error", e), null));
  console.log("Submit result:", res);
});
```

If REST calls fail with 401/403, the app’s public token lacks required scopes. In the UI, a friendly message appears; in console, you’ll see “Ecwid token lacks required scopes”.

## Telemetry verification

```javascript
// javascript
// After viewing registration page or showing the banner:
console.log("Telemetry attached?", typeof window.trackWholesaleEvent === "function");
// Click the banner link and watch for console lines prefixed with [WholesaleTelemetry]
```

## Expected Results Checklist

- Ecwid API ready and tokens retrievable via `getAppPublicToken`.
- Category banner renders with image and description overlay.
- Product pages with TAGS show a tags block.
- Guests cannot see prices or price filter; logged-in customers can.
- Registration banner appears for guests/non-approved; registration page shell renders; submission works via Ecwid REST.

## Troubleshooting

- Banner not appearing: Verify category image in API response; confirm design setting “Hide category names”.
- Tags not showing: Ensure product has TAGS attribute values; check console for `Tag System` warnings.
- REST calls failing: Confirm token retrieval via `Ecwid.getAppPublicToken("custom-app-121843055-1")`; do not log token values.
- Wholesale visibility not toggling: Check console for `Wholesale` warnings; ensure SPA navigation triggers `Ecwid.OnPageLoaded`.
