# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Lightspeed (Ecwid) custom storefront app that enhances e-commerce functionality with wholesale features, category banners, and product tags. The app runs entirely on the storefront using Ecwid's Storefront JS API and REST endpoints.

**Key Features:**
- **Wholesale Gating** — Price visibility control (hide for guests, show for logged-in wholesale members)
- **Category Banners** — Full-width image hero banners with description overlays
- **Product Tags** — Tag display from TAGS attributes below product descriptions
- **Wholesale Registration** — Account-based registration flow integrated into Ecwid's account pages

**Important Constraints:**
- Only `app.js` and `app.css` are loaded by Lightspeed
- All logic must run client-side on the storefront
- No custom backend or proxy server
- Uses Ecwid Storefront JS API and public REST endpoints only

## Product Requirements (PRDs)

Each feature has a dedicated PRD with detailed specifications, acceptance criteria, and implementation notes:

- **[docs/registration.prd](docs/registration.prd)** — Wholesale registration flow (Phase 1 complete, Phase 2 pending)
- **[docs/wholesale-gating.prd](docs/wholesale-gating.prd)** — Price visibility and customer group detection (production-ready)
- **[docs/category-banners.prd](docs/category-banners.prd)** — Hero banner rendering (production-ready)
- **[docs/product-tags.prd](docs/product-tags.prd)** — Tag display (Phase 1 complete, Phase 2 pending)

**Master PRD Index:** [docs/index.prd](docs/index.prd) — Overview, cross-cutting concerns, and modularization roadmap

## Development Commands

This project has no build process. The files are static and hosted directly:
- `app.js` - hosted at https://keryxsolutions.github.io/lightspeed-wholesale/app.js
- `app.css` - hosted at https://keryxsolutions.github.io/lightspeed-wholesale/app.css

**Testing:**
- Manual testing in browser console using snippets from `TESTING.md`
- Test on staging store before production deployment
- Verify all features after changes: price visibility, category banner, product tags, registration flow

**Deployment:**
1. Update `app.js` or `app.css` locally
2. Commit and push to GitHub (triggers GitHub Pages deployment)
3. Test on staging store
4. Promote to production

## Architecture

### Core Modules (in app.js)

The application is organized into four main initialization functions called from `Ecwid.OnAPILoaded`:

1. **`initializeWholesalePriceVisibility()`** (lines 145-238)
   - Hides prices/buy buttons for guests, shows for logged-in users
   - Injects/removes `#wholesale-hide-css` style tag
   - Updates `ec.storefront.config` settings
   - Polls for `Ecwid.Customer` API readiness
   - Responds to `Ecwid.OnPageLoaded` events for SPA navigation

2. **`initializeCategoryBanner()`** (lines 260-445)
   - Fetches category data via Ecwid REST API (`/api/v3/{storeId}/categories/{categoryId}`)
   - Creates full-width banner from category image
   - Overlays category description text
   - Requires "Hide category names" design setting
   - Injects external CSS and Google Fonts

3. **`initializeProductTagSystem()`** (lines 451-656)
   - Fetches product data via REST API (`/api/v3/{storeId}/products/{productId}`)
   - Renders tags from TAGS attribute below product content
   - Provides tag links (currently placeholder alerts)
   - Requires TAGS attribute configured in Product Types

4. **`initializeWholesaleRegistration()`** (lines 670-1068)
   - Shows banner for logged-in non-wholesale users
   - Injects registration form on `/products/account/register` page
   - Hijacks `.ec-cart__body-inner` container to render custom form
   - Prefills from `Ecwid.Customer.get()` data
   - **Submits to external Registration Server** via `POST {REG_SERVER_URL}/api/register`
   - Authenticates with storefront session token (Bearer)
   - Server handles all Admin REST operations (profile updates, extra fields, group assignment)
   - Uses MutationObserver to maintain form on SPA redraws
   - Cleans up when leaving registration page

### Key Utilities

**Token Resolution** (lines 78-103):
- `waitForEcwidAndTokens()` - Polls until Ecwid API is ready, returns `storeId` and `publicToken`
- Used by all modules that call Ecwid REST endpoints (category banner, product tags)

**Session Token** (lines 106-121):
- `getStorefrontSessionToken()` - Retrieves storefront session token for external API authentication
- Primary: `Ecwid.Storefront.getSessionToken()` (preferred)
- Fallback: Internal `storefrontApiClient.sessionStorageOptions.sessionToken._value`
- Used by registration module to authenticate with Registration Server

**Customer Profile Fetch** (lines 221-244):
- `fetchCustomerProfileFromServer()` - Fetches full customer data from Registration Server
- Calls `GET {REG_SERVER_URL}/api/customer?storeId={storeId}` with session token
- Returns phone and extra field values (taxId, cellPhone, hear) not available from Storefront JS API
- Used in edit mode to prefill form with stored values

**API Helpers** (lines 115-135):
- `ecwidFetchJSON(path, options)` - Makes authenticated REST calls with public token
- Automatically adds Authorization header with Bearer token

**Routing** (lines 16-23):
- `isAccountRegisterPath()` - Detects `/products/account/register` in pathname or hash
- `toAccountRegisterPath()` - Returns registration route

**Telemetry** (lines 40-59):
- `trackWholesaleEvent(name, props)` - Console-based event tracking with deduplication
- Tracks banner, registration view/submit/success/failure events

### Customer Extra Fields Architecture

**Client Responsibility:** UI metadata only
**Server Responsibility:** Field mapping, key resolution, persistence

The registration form loads extra field definitions **only for UI purposes** (labels, placeholders, dropdown options):

1. **Source**: `Ecwid.getAppPublicConfig(clientId)["extraFields"]`
   - App-controlled configuration published via App Storage
   - Contains **UI metadata only**: title, type, textPlaceholder, required, options
   - Used to render form fields with correct labels and placeholders

2. **What Client Does:**
   - Renders form fields with labels/placeholders from App Storage
   - Validates required fields before submission
   - Sends field values to Registration Server

3. **What Server Does** (via Registration Server):
   - Resolves field keys via `GET /api/v3/{storeId}/store_extrafields/customers`
   - Maps submitted values to correct extra field keys
   - Persists values via `PUT /api/v3/{storeId}/customers/{customerId}` (Admin REST)
   - Expected fields: "Tax ID", "How did you hear about us?", "Cell Phone"

**Removed:** Checkout-based discovery fallback (no longer needed; server handles field mapping)

See [registration.prd](docs/registration.prd) Section 4 for full API contract between client and server.

### SPA Navigation Handling

All modules hook into Ecwid's SPA events:
- `Ecwid.OnAPILoaded.add(callback)` - Initial app load
- `Ecwid.OnPageLoaded.add(callback)` - Navigation events with page context
- Registration module also listens to `window.hashchange` for hash-based routing

### DOM Manipulation Patterns

**Idempotent Node Management** (lines 26-38):
- `ensureSingletonNode(id, createEl)` - Create/return singleton DOM nodes
- `removeNodeById(id)` - Safe removal helper

**Account Page Hijacking** (lines 822-855):
- `queryAccountBody()` - Find `.ec-cart__body-inner` container
- `hijackAccountBody(container)` - Hide existing children, insert `#account-register-root`
- `restoreAccountBody(container)` - Restore hidden children, remove custom root
- `startAccountRegisterObserver(onChange)` - Watch for SPA redraws
- `stopAccountRegisterObserver()` - Clean up observer

## Important Implementation Details

### Wholesale Group Detection

The app determines wholesale status through:
1. **Preferred**: `customer.membership.name` from `Ecwid.Customer.get()` (lines 710-719)
   - Compare case-insensitively to `WHOLESALE_GROUP_NAME` (default: "Wholesaler")
2. **Fallback**: Session cache `WHOLESALE_STATUS_CACHE` (lines 694, 766-768)

### Registration Form Submission

The form uses the Storefront customer update endpoint (lines 878-889):
```javascript
POST https://app.ecwid.com/storefront/api/v1/{storeId}/customer/update
Content-Type: application/json
Credentials: include (to send session cookie)

{
  updatedCustomer: {
    name: "...",
    billingPerson: { name, companyName, postalCode, phone }
  },
  checkout: {
    extraFields: { [key]: { title, value } },
    extraFieldsPayload: {
      mapToUpdate: { [key]: { title, type, required, cpField: true } },
      updateMode: "UPDATE_HIDDEN"
    }
  },
  lang: "en"
}
```

**Important**: Group assignment happens server-side via Ecwid Automations/Webhooks (not in client code).

### CSS Injection Strategy

1. External CSS loaded from GitHub Pages (lines 420-435, 617-628)
2. Category banner and tag styles in `app.css`
3. Price-hiding CSS injected inline as `<style>` tag when needed (lines 147-173)
4. Banner styling uses inline styles for stability (lines 786-794)

### Error Handling Pattern

All modules use defensive coding:
- Try-catch blocks around DOM operations
- Console warnings prefixed by module: "Category Banner:", "Tag System:", "Wholesale Reg:", etc.
- Null checks before DOM queries
- API call failures logged but don't crash app

## Configuration

**App Client ID**: `custom-app-121843055-1` (line 7, used throughout)

**Feature Flags** (lines 10-13):
```javascript
const WHOLESALE_FLAGS = {
  ENABLE_WHOLESALE_REGISTRATION: true,
  ENABLE_WHOLESALE_BANNER: true,
};
```

**Override Points**:
- `window.WHOLESALE_GROUP_NAME` - Wholesale group name (default: "Wholesaler")
- `window.trackWholesaleEvent` - Exposed telemetry function

## Required Ecwid Configuration

**Design Settings**:
- Category name position: "Hide category names" (for banner to work)
- Product prices: OFF by default (wholesale visibility depends on this)

**Product Types**:
- Add attribute "Tags" with type `TAGS` and display `DESCR`

**App Token Scopes** (must grant):
- Customers: read/write
- Customer groups: read
- Customer extra fields: read/write
- Categories: read
- Products: read

**Customer Extra Fields** (created via REST or admin):
- "Tax ID" (required)
- "How did you hear about us?" (optional, select type preferred)
- "Cell Phone" (optional)

## Common Development Tasks

### Adding a New Module

1. Create `initialize[Feature]()` function
2. Call from `Ecwid.OnAPILoaded.add()` block (line 61)
3. Hook `Ecwid.OnPageLoaded` for SPA navigation
4. Use `waitForEcwidAndTokens()` for API calls
5. Add CSS to `app.css` if needed
6. Update `TESTING.md` with test scenarios

### Modifying REST API Calls

All REST calls should use:
- `ecwidFetchJSON(path, options)` helper (line 115)
- Public token from `Ecwid.getAppPublicToken(clientId)`
- Base URL: `https://app.ecwid.com/api/v3/{storeId}`

### Updating Registration Form Fields

1. Modify field definitions in `loadCheckoutExtraFieldDefsSafe()` fallback (lines 922-927)
2. Update `renderOrUpdateAccountRegister()` form HTML (lines 964-997)
3. Update `buildStorefrontUpdatePayload()` mapping (lines 1001-1035)
4. Update PRD: [docs/registration.prd](docs/registration.prd) (canonical spec for registration feature)

### Debugging

**Console Prefixes**:
- `[WholesaleTelemetry]` - Event tracking logs
- `"Category Banner:"` - Category banner module
- `"Tag System:"` - Product tag module
- `"Wholesale:"` - Price visibility module
- `"Wholesale Reg:"` - Registration module

**Key Global Objects**:
- `window.Ecwid` - Ecwid Storefront API
- `window.ec.storefront.config` - Storefront configuration
- `window.ec.order.extraFields` / `window.ec.checkout.extraFields` - Field definitions

**Useful Console Commands** (from TESTING.md):
```javascript
// Check API readiness
console.log("Ecwid exists:", !!window.Ecwid);

// Get store ID and token availability
const storeId = Ecwid.getOwnerId();
const token = Ecwid.getAppPublicToken("custom-app-121843055-1");
console.log("Store ID:", storeId, "Token available:", !!token);

// Check current customer
Ecwid.Customer.get(c => console.log("Customer:", c));

// Check last loaded page
console.log("Page:", Ecwid.getLastLoadedPage());
```

## Files Structure

```
/
├── app.js                          # Main application (all modules)
├── app.css                         # Styles for banner, tags, forms
├── README.md                       # Feature overview and deployment checklist
├── TESTING.md             # Browser console test scenarios
├── tasks.md                        # Implementation task list
├── docs/
│   └── index.prd  # Master PRD index
└── ecwid-scripts-min/              # Reference: minified Ecwid storefront scripts
    ├── ecwid-storefront.js
    ├── apps-js-api.js
    └── ...
```

## Common Pitfalls

1. **Duplicate DOM Injection**: Always check if element exists before creating (use `getElementById` guards)
2. **SPA Navigation**: Module state must be idempotent; clean up on page change
3. **Token Timing**: Wait for `Ecwid.getAppPublicToken()` to be available before REST calls
4. **Price Visibility**: Requires both login check AND wholesale group membership
5. **Form Hijacking**: Must use MutationObserver on account pages due to Ecwid SPA redraws
6. **Extra Fields**: Keys may differ from titles; use normalized lookup (lines 891-909)
7. **Session Cookie**: Storefront `customer/update` requires `credentials: include` (line 884)

## Testing Checklist

After any changes, verify:
- [ ] Category pages show banner with image and overlay (requires image + description)
- [ ] Product pages show tags (requires TAGS attribute values)
- [ ] Guests see no prices or buy buttons
- [ ] Logged-in non-wholesale users see prices hidden and registration banner
- [ ] Logged-in wholesale users see prices and no banner
- [ ] `/products/account/register` loads form with prefilled data
- [ ] Form submission saves customer data (check Network tab)
- [ ] Console shows no errors during navigation
- [ ] All telemetry events fire correctly

## References

- **Ecwid Storefront JS API**: https://docs.ecwid.com/storefronts
- **REST API Reference**: https://docs.ecwid.com/api-reference/rest-api
- **OnPageLoaded Events**: https://docs.ecwid.com/storefronts/track-storefront-events/page-is-loaded-events
- **Customer Management**: https://docs.ecwid.com/storefronts/manage-customers-on-the-storefront
- **App Settings**: https://docs.ecwid.com/develop-apps/app-settings

## Version History

Current implementation reflects PRD v1.1 (storefront-only approach):
- Removed custom backend/proxy server
- Removed Admin REST calls from storefront
- Registration integrated into `/products/account/register`
- Uses Storefront `customer/update` endpoint with session cookies
- Group assignment via Ecwid Automations/Webhooks
