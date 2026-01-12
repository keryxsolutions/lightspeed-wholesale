# Tasks: Wholesale Registration Flow

## Documentation Consolidation (2025-12-08)
- [x] Rename master PRD to `docs/index.prd` and update links (README, assistant guides)
- [x] Merge `TESTING_STRATEGY.md` + `E2E_TESTING_GUIDE.md` into `TESTING.md`
- [x] Remove archived `IMPLEMENTATION_SUMMARY.md` (content reflected in `index.prd` version history)
- [x] Align feature PRDs with current code (category font/DOM, gating selectors + UI hides, registration banners/redirect behavior)
- [x] Add APP_STORAGE notes in registration appendix describing v2 public config contract and publication flow

## Public Config v2 Update (2025-11-12)
- [x] Switch docs to App Public Config v2 shape `{ version, updatedAt, hash, extraFields[] }`
- [x] Remove `entityTypes` filtering in client (curated upstream)
- [x] Use `placeholder` (not `textPlaceholder`) in client UI
- [x] Update docs/registration.prd Extra Fields section
- [x] Update docs/index.prd (Last Updated + Config bullet)
- [x] Update docs/ECWID-REGISTRATION-API.md to prefer `Ecwid.getAppPublicConfig(clientId)`
- [x] Confirm app.js already aligned (no code changes required)
- [ ] Add E2E test covering v2 config rendering (Tax ID, Cell phone, Hear fields)

## Registration & Gating Enhancements (Version 2.2, 2025-11-11)
- [x] Banner persistence utilities (`setRegistrationBanner`, `restoreRegistrationBanner`, `renderTopBanner`)
- [x] Auto-redirect once per session for logged-in non-wholesale users
- [x] Cart/favorites hiding for non-wholesale users
- [x] Customer refresh after successful registration
- [x] Button text updated to "Register"
- [ ] Enable success redirect to `/products` after registration (currently commented)
- [ ] Add regression tests for banner persistence + auto-redirect in `TESTING.md`

## Registration Edit Mode & Access (2025-12-08)
- [x] Add route helpers for `/products/account/edit` plus register/edit mode resolver
- [x] Enforce access matrix: guest → `/account`, non-wholesale blocks edit, wholesale blocks register
- [x] Propagate mode flag through render/submit: hide email on edit, button label Save vs Register, mode-specific success/error copy, edit redirect to `/products/account`
- [x] Keep register success redirect optional; leave debug toggle noted
- [x] Update auto-redirect guard to skip when on edit or wholesale
- [x] Fix account navigation from register/edit to `/products/account` (force rehydrate + cleanup)
- [x] Inject account info card on `/products/account` with name/state/email placeholders; idempotent cleanup + minimal CSS (wholesale-only)
- [x] Expand non-wholesale UI hides to guests and all cart anchors; keep account step hides on account pages
- [x] Refresh docs (registration.prd, wholesale-gating.prd, index.prd) for new flows and hide rules
- [ ] Verification: exercise register + edit flows (access redirects, banners per mode), account card render/removal, and cart/account hides for guests/non-wholesale/wholesale on SPA navigation

## Account Info Card & Edit Mode Enhancements (2025-12-08)

### Account Info Card Updates
- [x] Update `injectAccountInfoCard` to change edit link to `/products/account/edit`
- [x] Update card step title to display company name instead of customer name
- [x] Update card step text to display formatted shipping address (street, city, state, ZIP)
- [x] Add step section for Tax ID (label and value)
- [x] Add step section for Phone and Cell Phone (labels and values)
- [x] Replace SVG icon with company/building style (thin outline)
- [x] Replace class `.ec-cart-step--email` with `.ec-cart-step--address`

### Edit Mode Form Enhancements
- [x] Add State/Province field (text input with `stateOrProvinceCode` prefill)
- [x] Add Street Address field (text input with `billingPerson.street` prefill)
- [x] Add City field (text input with `billingPerson.city` prefill)
- [x] Conditionally render address fields only in edit mode (not register mode)
- [x] Update model prefill to include street, city, stateOrProvinceCode from customer data
- [x] Update `getVals()` to capture new address fields
- [x] Update `buildRegistrationServerPayload()` to include street, city, stateOrProvinceCode
- [x] Add CSS rule to show country field in edit mode (hide in register mode only)

### Verification
- [ ] Test account info card displays company/address/tax/phone info correctly
- [ ] Test edit mode form shows all address fields with prefilled data
- [ ] Test register mode form does NOT show new address fields
- [ ] Test form submission includes new fields in payload
- [ ] Test country field visibility (hidden in register, shown in edit)

## Remaining Follow-Ups
- [ ] Ensure server publishes v2 public config after extrafield changes (hash-based no-op)
- [ ] Expand country list if business requirements change (currently US/UM/VI)
- [ ] Replace #tile-feature-list-M5ktKX .ins-tile__feature-icon svg with ~/Downloads/esprit lotus v6_bw.svg
