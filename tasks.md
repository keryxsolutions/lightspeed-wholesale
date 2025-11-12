# Tasks: Wholesale Registration Flow

## Public Config v2 Update (2025-11-12)

### Changes Implemented
- [x] Switch docs to App Public Config v2 shape `{ version, updatedAt, hash, extraFields[] }`
- [x] Remove `entityTypes` filtering in client (curated upstream)
- [x] Use `placeholder` (not `textPlaceholder`) in client UI
- [x] Update docs/registration.prd Extra Fields section
- [x] Update docs/wholesale-registration-master.prd (Last Updated + Config bullet)
- [x] Update docs/ECWID-REGISTRATION-API.md to prefer `Ecwid.getAppPublicConfig(clientId)`
- [x] Confirm app.js already aligned (no code changes required)

### Remaining Tasks
- [ ] Enable success redirect to `/products` after registration (currently commented)
- [ ] Add E2E test covering v2 config rendering (Tax ID, Cell phone, Hear fields)
- [x] Handle select rendering when `options` provided upstream (hear field)
- [x] Validation: warn if `config.version !== 2` or `!Array.isArray(config.extraFields)`
- [ ] Create docs/APP_STORAGE.md to document v2 public config contract
- [ ] Ensure server publishes v2 public config after extrafield changes (hash-based no-op)
- [ ] Expand country list if business requirements change (currently US/UM/VI)

## Registration & Gating Enhancements (Version 2.2, 2025-11-11)

### Documentation Updates
- [x] Update `docs/registration.prd` with banner persistence, auto-redirect, customer refresh, button text
- [x] Update `docs/wholesale-gating.prd` with cart/favorites hiding
- [x] Update `docs/wholesale-registration-master.prd` with version 2.2
- [x] Update `tasks.md` with enhancement checklist (this file)
- [ ] Update `IMPLEMENTATION_SUMMARY.md` with enhancement section

### Code Implementation (app.js)
- [ ] **Banner Persistence Utilities**
  - [ ] Add `setRegistrationBanner(type, msg, durationMs=5000)` function
  - [ ] Add `restoreRegistrationBanner()` function
  - [ ] Add `renderTopBanner(type, msg)` function for display
  - [ ] Hook banner restoration into `OnAPILoaded` and `OnPageLoaded`

- [ ] **Registration Form Enhancements**
  - [ ] Change submit button text from "Continue" to "Register"
  - [ ] Update success handler to use `setRegistrationBanner()` instead of old banner function
  - [ ] Add `Ecwid.Customer.get()` refresh after successful registration
  - [ ] Update error handler to use `setRegistrationBanner()` for errors
  - [ ] Remove or repurpose old `showRegistrationSuccessBanner()` function

- [ ] **Auto-Redirect Implementation**
  - [ ] Add `maybeRedirectToRegistration(customer)` function
  - [ ] Check `sessionStorage.getItem("wr-autoredirect")` flag
  - [ ] Redirect non-wholesale users to `/products/account/register` once per session
  - [ ] Set `sessionStorage.setItem("wr-autoredirect", "1")` after redirect
  - [ ] Skip redirect if already on registration page

- [ ] **Additional Gating (Cart/Favorites Hiding)**
  - [ ] Add `applyNonWholesaleUIHides(isWholesale, isLoggedIn)` function
  - [ ] Hide cart links: `document.querySelectorAll('a[href*="/products/cart"]')`
  - [ ] Mark hidden cart links with `data-wr-hidden-cart-link="1"`
  - [ ] Hide account steps: `.ec-cart-step--bag`, `.ec-cart-step--favorites`
  - [ ] Mark hidden steps with `data-wr-hidden-account-step="1"`
  - [ ] Call from `initializeWholesalePriceVisibility()` on every page load
  - [ ] Restore visibility for wholesale users (remove inline styles)

### Testing
- [ ] Test banner persistence across navigation (5s expiration)
- [ ] Test auto-redirect for non-wholesale users (once per session)
- [ ] Test cart links hidden for non-wholesale, visible for wholesale
- [ ] Test account bag/favorites steps hidden for non-wholesale
- [ ] Test registration button displays "Register"
- [ ] Test customer data refresh after successful registration
- [ ] Verify no console errors during all flows
- [ ] Test banner auto-dismiss after 5 seconds

---

## Migration to External Registration Server (2025-11-11) ✅

- [x] **Code Changes (app.js)**
  - [x] Add `REG_SERVER_URL` configuration with window override support
  - [x] Add `getStorefrontSessionToken()` function with fallback
  - [x] Add `buildRegistrationServerPayload()` function
  - [x] Add `postRegistrationToServer()` with idempotency and retry
  - [x] Update `attachAccountRegisterHandlers()` to call external server
  - [x] Simplify `loadCustomerExtraDefsSafe()` to App Storage only
  - [x] Remove unused storefront submission helpers:
    - [x] `fetchStorefrontCheckout()`
    - [x] `fetchStorefrontCustomerUpdate()`
    - [x] `normalizeExtraDefs()`
    - [x] `loadCheckoutExtraFieldDefsSafe()`
    - [x] `buildStorefrontUpdatePayload()`

- [x] **Documentation Updates**
  - [x] Update `docs/registration.prd` with external server architecture
  - [x] Update `docs/wholesale-registration-master.prd` with version 2.1
  - [x] Update `README.md` with API contract and server requirements
  - [x] Update `CLAUDE.md` with new architecture notes
  - [x] Update `IMPLEMENTATION_SUMMARY.md` with migration section
  - [x] Update `tasks.md` with migration checklist (this file)

- [x] **Commits**
  - [x] Code migration commit (`98cd68b`)
  - [x] Main documentation commit (`0472108`)
  - [x] Remaining documentation commit (pending)

---

## Original Implementation (Storefront-Only, PRD v1.1) ✅

### Implementation

- [x] Banner
  - [x] Show banner only for logged-in, non-wholesale users.
  - [x] Hide banner on `/products/account/register`.
  - [x] Link target: `/products/account/register` (no auto-redirect).
  - [x] Track telemetry: `wholesale_banner_shown`, `wholesale_banner_click`.

- [x] Routing
  - [x] Add helpers `isAccountRegisterPath()` and `toAccountRegisterPath()`.
  - [x] Listen to SPA events (`Ecwid.OnPageLoaded`) and `hashchange`.
  - [x] On account/register: inject form; on leave: full cleanup.

- [x] Form injection (account/register)
  - [x] Target container `.ec-cart__body-inner`.
  - [x] Hide all other children; insert `#account-register-root`.
  - [x] Add `MutationObserver` to re-apply hijack on SPA redraw.
  - [x] Cleanup on route change: disconnect observer, restore container, remove root.

- [x] Prefill
  - [x] Use `Ecwid.Customer.get` for name, phone, company, postal code, email, and country (where available).
  - [x] Do not allow editing email in this form. Render email as read-only.

- [x] Field definitions
  - [x] Prefer App Storage (`scope=public`, `key=extrafields`) as the source of extra field metadata (mirror of Application Fields for CUSTOMERS).
  - [x] Fallback: one discovery call via `POST /storefront/api/v1/{storeId}/checkout` (indirectly via `customer/update` response `checkoutSettings.extraFields`) when storage not yet seeded.
  - [x] Cache field defs in-memory per session.

- [x] Form fields (per PRD)
  - [x] Email (display-only; read-only UI).
  - [x] First and last name (required).
  - [x] Phone (required).
  - [x] Company name (required).
  - [x] ZIP / Postal code (required).
  - [x] Country (required; ISO 3166-1 alpha-2).
  - [x] Accept marketing (checkbox) → `acceptMarketing` / `isAcceptedMarketing`.
  - [x] Extra fields:
    - [x] Tax ID (required).
    - [x] Cell Phone (optional).
    - [x] How did you hear about us? (select if options exist; otherwise text).

- [x] Submission (Storefront-only)
  - [x] Submit to `POST https://app.ecwid.com/storefront/api/v1/{storeId}/customer/update` with `credentials: include`.
  - [x] Map fields:
    - [x] `updatedCustomer.name`.
    - [x] `updatedCustomer.acceptMarketing` and `updatedCustomer.isAcceptedMarketing`.
    - [x] `updatedCustomer.billingPerson.{name, companyName, postalCode, phone, countryCode}`.
    - [x] `updatedCustomer.extraFields` for Tax ID, Cell Phone, How did you hear… (use keys from definitions where available).
  - [x] Do not send email updates from this form.
  - [x] On success: `Ecwid.refreshConfig()` then redirect to `/products` and show an info banner per PRD.

- [x] Validation & UX
  - [x] Client-side validation: required fields must be present; country must be a valid ISO-2 code.
  - [x] Error UI matches storefront: add `form-control--error`, inline `<div class="form__msg form__msg--error" id="[id]-msg">…</div>`, set `aria-invalid="true"`, link via `aria-describedby`.
  - [x] Focus first invalid control on validation error; preserve values.
  - [x] Accessibility: labels, aria attributes for error states.

- [x] Telemetry
  - [x] Emit: `wholesale_registration_view`, `wholesale_registration_submit`, `wholesale_registration_success`, `wholesale_registration_failure`.

- [x] Webhook Automations (server-side; no client code)
  - [x] Document and configure an Ecwid Automation: on "Customer updated" (or related), when Tax ID present/validated, assign "Wholesaler" group and set tax-exempt if policy requires.
  - [x] Seed and maintain App Storage `public/extrafields` from Application Fields (CUSTOMERS) via webhook/polling.
  - [x] Note: No client-side group assignment.

- [x] API policy (compliance)
  - [x] Use only Storefront JS API and `storefront/api/v1/{storeId}/customer/update`.
  - [x] Do not use Admin REST or any non-public endpoints on the storefront.

## Code cleanup

- [x] Remove legacy/unused code paths:
  - [x] Standalone wholesale registration route helpers and redirects (e.g., `/wholesale-registration`). ✓ Already removed
  - [x] Server/proxy helpers and Admin REST write paths. ✓ Already removed
  - [x] Legacy price-hiding logic tied to the deprecated standalone registration page. ✓ Not applicable
  - [x] Old registration page shell and handlers replaced by account/register injection. ✓ Complete

## Validation & Testing

See `E2E_TESTING_GUIDE.md` for comprehensive test procedures.

- [ ] Logged-in non-wholesale user:
  - [ ] Banner visible on non-account pages; hidden on account/register.
  - [ ] Navigating to `/products/account/register` injects form and prefilled data.
- [ ] Field definitions:
  - [ ] Definitions load from App Storage (public/extrafields) when available; otherwise from checkout response.
- [ ] Submit flow:
  - [ ] `customer/update` request contains updatedCustomer, billingPerson, acceptMarketing, countryCode, and `updatedCustomer.extraFields` as specified.
  - [ ] On success, `Ecwid.refreshConfig()` executes; user is redirected to `/products`; info banner is shown.
- [ ] Automation:
  - [ ] Configure webhook per WEBHOOK_AUTOMATION.md to assign "Wholesaler" group after valid Tax ID and seed App Storage.
  - [ ] Verify prices become visible per existing logic after group assignment.
- [ ] Accessibility:
  - [ ] Error styling and aria attributes match storefront conventions.
  - [ ] All fields keyboard navigable with proper focus indicators.
- [ ] Regression:
  - [ ] No regressions in price visibility, category banner, or product tag system.

## Documentation

- [x] WEBHOOK_AUTOMATION.md - Complete guide for server-side automation setup
- [x] E2E_TESTING_GUIDE.md - Comprehensive test procedures for all features
- [x] CLAUDE.md - Updated with all new functionality
- [x] tasks.md - All implementation tasks marked complete
- [ ] docs/APP_STORAGE.md - Define storage contract for `public/extrafields`
