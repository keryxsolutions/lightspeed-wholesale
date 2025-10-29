# Testing Strategy – Lightspeed eCom Wholesale App (Storefront)

This guide validates the current app.js implementation across four areas:

- Product tag display (from TAGS attribute via REST)
- Category banner (full-width image with description overlay)
- Wholesale price visibility (hide for guests, show for logged-in)
- Wholesale registration flow (banner + /wholesale-registration page shell)

Run the quick console checks below on your live store. All snippets are intended for the browser console with the app installed.

## Prerequisites

- Design setting: Hide category names (Design → Category name position → Hide) for the banner effect.
- Categories: Have an image and a meaningful description.
- Product Types: Add a TAGS attribute (type TAGS, display DESCR) and assign tags to test products.
- App installed and loaded (clientId embedded in app.js): `custom-app-121843055-1`.
- Optional backend (only if using registration endpoints): Set `window.WHOLESALE_API_BASE` to your backend base URL (must implement `/api/wholesale/status` and `/api/wholesale/register`).

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

## Phase 4: Wholesale registration flow

Features:

- A sticky banner prompts users to register unless they are approved wholesale.
- Visiting `/wholesale-registration` renders a page shell with a form.
- Submitting posts to your backend (`WHOLESALE_API_BASE`): `/api/wholesale/register`, then checks `/api/wholesale/status`.

Steps:

```javascript
// 1) Banner visibility (guest or non-approved user)
setTimeout(() => {
  console.log("Banner node:", document.getElementById('wholesale-registration-banner'));
}, 1000);

// 2) Navigate to /wholesale-registration
// Expect: #wholesale-registration-root exists, prices are force-hidden on this route
setTimeout(() => {
  console.log("Reg root:", document.getElementById('wholesale-registration-root'));
}, 1200);
```

Validation notes:

- Submit button disabled until all required fields are valid and user is signed in.
- On success and immediate approval, user is redirected to `/products`.
- If approval is pending, a status message shows.

## Expected Results Checklist

- Ecwid API ready and tokens retrievable via `getAppPublicToken`.
- Category banner renders with image and description overlay.
- Product pages with TAGS show a tags block.
- Guests cannot see prices or price filter; logged-in customers can.
- Registration banner appears for guests/non-approved; registration page shell renders; submission works against backend if configured.

## Troubleshooting

- Banner not appearing: Verify category image in API response; confirm design setting “Hide category names”.
- Tags not showing: Ensure product has TAGS attribute values; check console for `Tag System` warnings.
- REST calls failing: Confirm token retrieval via `Ecwid.getAppPublicToken("custom-app-121843055-1")`; do not log token values.
- Wholesale visibility not toggling: Check console for `Wholesale` warnings; ensure SPA navigation triggers `Ecwid.OnPageLoaded`.
- Registration endpoints: If using backend, ensure `window.WHOLESALE_API_BASE` is set and endpoints return expected JSON per app.js contract.
