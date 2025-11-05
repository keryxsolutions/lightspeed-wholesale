# Tasks: Storefront-Only Wholesale Registration (aligns with PRD v1.1)

## Implementation

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
  - [x] Do not allow editing email in this form.

- [x] Field definitions
  - [x] Prefer `ec.order.extraFields` as primary source for extra field metadata (keys, titles, placeholders, options).
  - [x] Fallback: one discovery call via `POST /storefront/api/v1/{storeId}/customer/update` and read `checkoutSettings.extraFields`.
  - [x] Cache field defs in-memory per session.

- [x] Form fields (per PRD)
  - [x] Email (display-only; read-only UI).
  - [x] First and last name (required).
  - [x] Phone (required).
  - [x] Company name (required).
  - [x] ZIP / Postal code (required).
  - [x] Country (required; ISO 3166-1 alpha-2).
  - [x] Accept marketing (checkbox) → `acceptMarketing`.
  - [x] Extra fields:
    - [x] Tax ID (required).
    - [x] Cell Phone (optional).
    - [x] How did you hear about us? (select if options exist; otherwise text).

- [x] Submission (Storefront-only)
  - [x] Submit to `POST https://app.ecwid.com/storefront/api/v1/{storeId}/customer/update` with `credentials: include`.
  - [x] Map fields:
    - [x] `updatedCustomer.name`.
    - [x] `updatedCustomer.acceptMarketing`.
    - [x] `updatedCustomer.billingPerson.{name, companyName, postalCode, phone, countryCode}`.
    - [x] `checkout.extraFields` for Tax ID, Cell Phone, How did you hear… (use keys from definitions where available).
    - [x] Include `extraFieldsPayload.mapToUpdate` and `updateMode: "UPDATE_HIDDEN"` for persistence where applicable.
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
  - [x] Note: No client-side group assignment.
  - [x] See WEBHOOK_AUTOMATION.md for detailed implementation guide.

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
  - [ ] Definitions load from `ec.order.extraFields` when available; otherwise from `customer/update` response.
- [ ] Submit flow:
  - [ ] `customer/update` request contains updatedCustomer, billingPerson, acceptMarketing, countryCode, and extraFields payload as specified.
  - [ ] On success, `Ecwid.refreshConfig()` executes; user is redirected to `/products`; info banner is shown.
- [ ] Automation:
  - [ ] Configure webhook per WEBHOOK_AUTOMATION.md to assign "Wholesaler" group after valid Tax ID.
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
