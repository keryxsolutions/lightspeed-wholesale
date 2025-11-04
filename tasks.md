# Tasks: Storefront-Only Wholesale Registration (aligns with PRD v1.1)

## Implementation

- [ ] Banner
  - [ ] Show banner only for logged-in, non-wholesale users.
  - [ ] Hide banner on `/products/account/register`.
  - [ ] Link target: `/products/account/register` (no auto-redirect).
  - [ ] Track telemetry: `wholesale_banner_shown`, `wholesale_banner_click`.

- [ ] Routing
  - [ ] Add helpers `isAccountRegisterPath()` and `toAccountRegisterPath()`.
  - [ ] Listen to SPA events (`Ecwid.OnPageLoaded`) and `hashchange`.
  - [ ] On account/register: inject form; on leave: full cleanup.

- [ ] Form injection (account/register)
  - [ ] Target container `.ec-cart__body-inner`.
  - [ ] Hide all other children; insert `#account-register-root`.
  - [ ] Add `MutationObserver` to re-apply hijack on SPA redraw.
  - [ ] Cleanup on route change: disconnect observer, restore container, remove root.

- [ ] Prefill
  - [ ] Use `Ecwid.Customer.get` for name, phone, company, postal code, email, and country (where available).
  - [ ] Do not allow editing email in this form.

- [ ] Field definitions
  - [ ] Prefer `ec.order.extraFields` as primary source for extra field metadata (keys, titles, placeholders, options).
  - [ ] Fallback: one discovery call via `POST /storefront/api/v1/{storeId}/customer/update` and read `checkoutSettings.extraFields`.
  - [ ] Cache field defs in-memory per session.

- [ ] Form fields (per PRD)
  - [ ] Email (display-only; read-only UI).
  - [ ] First and last name (required).
  - [ ] Phone (required).
  - [ ] Company name (required).
  - [ ] ZIP / Postal code (required).
  - [ ] Country (required; ISO 3166-1 alpha-2).
  - [ ] Accept marketing (checkbox) → `acceptMarketing`.
  - [ ] Extra fields:
    - [ ] Tax ID (required).
    - [ ] Cell Phone (optional).
    - [ ] How did you hear about us? (select if options exist; otherwise text).

- [ ] Submission (Storefront-only)
  - [ ] Submit to `POST https://app.ecwid.com/storefront/api/v1/{storeId}/customer/update` with `credentials: include`.
  - [ ] Map fields:
    - [ ] `updatedCustomer.name`.
    - [ ] `updatedCustomer.acceptMarketing`.
    - [ ] `updatedCustomer.billingPerson.{name, companyName, postalCode, phone, countryCode}`.
    - [ ] `checkout.extraFields` for Tax ID, Cell Phone, How did you hear… (use keys from definitions where available).
    - [ ] Include `extraFieldsPayload.mapToUpdate` and `updateMode: "UPDATE_HIDDEN"` for persistence where applicable.
  - [ ] Do not send email updates from this form.
  - [ ] On success: `Ecwid.refreshConfig()` then redirect to `/products` and show an info banner per PRD.

- [ ] Validation & UX
  - [ ] Client-side validation: required fields must be present; country must be a valid ISO-2 code.
  - [ ] Error UI matches storefront: add `form-control--error`, inline `<div class="form__msg form__msg--error" id="[id]-msg">…</div>`, set `aria-invalid="true"`, link via `aria-describedby`.
  - [ ] Keep the button enabled; on submit, focus first invalid control; preserve values.
  - [ ] Accessibility: labels, aria attributes, optional `aria-live="polite"` summary region.

- [ ] Telemetry
  - [ ] Emit: `wholesale_registration_view`, `wholesale_registration_submit`, `wholesale_registration_success`, `wholesale_registration_failure`.

- [ ] Webhook Automations (server-side; no client code)
  - [ ] Document and configure an Ecwid Automation: on “Customer updated” (or related), when Tax ID present/validated, assign “Wholesaler” group and set tax-exempt if policy requires.
  - [ ] Note: No client-side group assignment.

- [ ] API policy (compliance)
  - [ ] Use only Storefront JS API and `storefront/api/v1/{storeId}/customer/update`.
  - [ ] Do not use Admin REST or any non-public endpoints on the storefront.

## Code cleanup

- [ ] Remove legacy/unused code paths:
  - [ ] Standalone wholesale registration route helpers and redirects (e.g., `/wholesale-registration`).
  - [ ] Server/proxy helpers and Admin REST write paths.
  - [ ] Legacy price-hiding logic tied to the deprecated standalone registration page.
  - [ ] Old registration page shell and handlers replaced by account/register injection.

## Validation & Testing

- [ ] Logged-in non-wholesale user:
  - [ ] Banner visible on non-account pages; hidden on account/register.
  - [ ] Navigating to `/products/account/register` injects form and prefilled data.
- [ ] Field definitions:
  - [ ] Definitions load from `ec.order.extraFields` when available; otherwise from `customer/update` response.
- [ ] Submit flow:
  - [ ] `customer/update` request contains updatedCustomer, billingPerson, acceptMarketing, and extraFields payload as specified.
  - [ ] On success, `Ecwid.refreshConfig()` executes; user is redirected to `/products`; info banner is shown.
- [ ] Automation:
  - [ ] Verify webhook assigns the “Wholesaler” group after valid Tax ID; prices become visible per existing logic.
- [ ] Accessibility:
  - [ ] Error styling and aria attributes match storefront conventions.
- [ ] Regression:
  - [ ] No regressions in price visibility, category banner, or product tag system.
