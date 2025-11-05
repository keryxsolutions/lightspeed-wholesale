# End-to-End Testing Guide for Wholesale Registration

## Pre-Test Setup

### Browser Console Access
1. Open your store's storefront in a browser
2. Open Developer Tools (F12 or Cmd+Option+I on Mac)
3. Navigate to the Console tab
4. Keep Network tab open in a second tab for monitoring API calls

### Test Accounts Needed
- **Guest account**: Not logged in
- **Regular customer**: Logged in, not in Wholesaler group
- **Wholesale customer**: Logged in, already in Wholesaler group

## Test Suite 1: Price Visibility

### TC-1.1: Guest User (Not Logged In)
**Expected**: Prices and buy buttons should be hidden

**Steps**:
1. Log out or open in incognito mode
2. Navigate to any category page
3. Navigate to any product page

**Verify**:
- [ ] Product prices are not visible
- [ ] "Add to Cart" buttons are not visible
- [ ] Price filter widget is not visible in sidebar
- [ ] No wholesale banner is shown

**Console Check**:
```javascript
// Verify hiding CSS is injected
console.log("Hide CSS present:", !!document.getElementById("wholesale-hide-css"));
// Should output: true
```

### TC-1.2: Logged-In Non-Wholesale User
**Expected**: Prices visible, wholesale banner shown

**Steps**:
1. Log in as a regular customer (not in Wholesaler group)
2. Navigate to category and product pages

**Verify**:
- [ ] Product prices ARE visible
- [ ] "Add to Cart" buttons ARE visible
- [ ] Wholesale registration banner appears at top of pages
- [ ] Banner text: "Register to access prices and place an order."
- [ ] Banner has "Register" link

**Console Check**:
```javascript
// Check customer status
Ecwid.Customer.get(c => console.log("Customer:", c));
// Should show customer with email but membership !== "Wholesaler"

// Check banner
console.log("Banner present:", !!document.getElementById("wholesale-registration-banner"));
// Should output: true
```

### TC-1.3: Logged-In Wholesale User
**Expected**: Prices visible, no banner

**Steps**:
1. Log in as wholesale customer (in Wholesaler group)
2. Navigate to pages

**Verify**:
- [ ] Product prices ARE visible
- [ ] "Add to Cart" buttons ARE visible
- [ ] NO wholesale registration banner

**Console Check**:
```javascript
Ecwid.Customer.get(c => {
  console.log("Membership:", c.membership);
  console.log("Is Wholesaler:", c.membership?.name?.toLowerCase() === "wholesaler");
});
// Should output: Is Wholesaler: true
```

## Test Suite 2: Wholesale Registration Banner

### TC-2.1: Banner Visibility
**Logged in as non-wholesale customer**

**Verify**:
- [ ] Banner appears on homepage
- [ ] Banner appears on category pages
- [ ] Banner appears on product pages
- [ ] Banner does NOT appear on `/products/account/register`

**Console Check**:
```javascript
// Check telemetry
console.log("[WholesaleTelemetry] wholesale_banner_shown");
// Should appear in console logs
```

### TC-2.2: Banner Click Tracking
**Steps**:
1. Clear console
2. Click "Register" link in banner

**Verify**:
- [ ] Navigates to `/products/account/register`
- [ ] Console shows: `[WholesaleTelemetry] wholesale_banner_click`

## Test Suite 3: Registration Form

### TC-3.1: Form Injection and Display
**Steps**:
1. Log in as non-wholesale customer
2. Navigate to `/products/account/register`

**Verify**:
- [ ] Form loads and displays
- [ ] Email field shows customer's email (disabled/read-only)
- [ ] All fields are present:
  - [ ] Email (read-only)
  - [ ] First and last name
  - [ ] Phone
  - [ ] Company name
  - [ ] ZIP / Postal code
  - [ ] Country dropdown
  - [ ] Tax ID
  - [ ] Cell Phone (optional)
  - [ ] How did you hear about us?
  - [ ] Accept marketing checkbox
  - [ ] Continue button

**Console Check**:
```javascript
// Check telemetry
console.log("[WholesaleTelemetry] wholesale_registration_view");
// Should appear when form loads

// Check form elements
console.log("Form present:", !!document.getElementById("wr-acc-form"));
console.log("Email field:", document.getElementById("wr-email-ro")?.value);
console.log("Email disabled:", document.getElementById("wr-email-ro")?.disabled);
// Should output: Email disabled: true
```

### TC-3.2: Form Prefill
**Expected**: Customer data should prefill from Ecwid.Customer.get()

**Console Check**:
```javascript
Ecwid.Customer.get(c => {
  const form = {
    email: document.getElementById("wr-email-ro")?.value,
    name: document.getElementById("wr-name")?.value,
    phone: document.getElementById("wr-phone")?.value,
    company: document.getElementById("wr-company")?.value,
    zip: document.getElementById("wr-zip")?.value,
    country: document.getElementById("wr-country")?.value
  };
  console.log("Customer data:", c);
  console.log("Form data:", form);
  console.log("Email matches:", form.email === c.email);
  console.log("Name matches:", form.name === (c.billingPerson?.name || c.name));
});
```

**Verify**:
- [ ] Email matches customer email
- [ ] Name prefilled if available
- [ ] Phone prefilled if available
- [ ] Company prefilled if available
- [ ] Postal code prefilled if available
- [ ] Country defaults to US or prefilled value

### TC-3.3: Field Definitions Discovery
**Expected**: Extra field definitions loaded from ec.order.extraFields or API

**Console Check**:
```javascript
// Check primary source
console.log("ec.order.extraFields:", window.ec?.order?.extraFields);
console.log("ec.checkout.extraFields:", window.ec?.checkout?.extraFields);

// If not available, check Network tab for POST to customer/update
// Response should contain checkoutSettings.extraFields
```

**Verify**:
- [ ] Tax ID field has correct label and placeholder
- [ ] "How did you hear" field is select (if options exist) or text
- [ ] Cell Phone field is optional

## Test Suite 4: Form Validation

### TC-4.1: Required Field Validation
**Steps**:
1. Clear all form fields
2. Click "Continue" button

**Verify**:
- [ ] Error messages appear for required fields:
  - [ ] First and last name
  - [ ] Phone
  - [ ] Company name
  - [ ] ZIP / Postal code
  - [ ] Country
  - [ ] Tax ID (if required)
- [ ] Error styling applied: `.form-control--error` class added
- [ ] Error messages have class `.form__msg--error`
- [ ] Invalid inputs have `aria-invalid="true"`
- [ ] Error messages linked via `aria-describedby`
- [ ] First invalid field receives focus

**Console Check**:
```javascript
// Check error elements
console.log("Error controls:", document.querySelectorAll(".form-control--error").length);
console.log("Error messages:", document.querySelectorAll(".form__msg--error").length);
console.log("Invalid inputs:", document.querySelectorAll("[aria-invalid='true']").length);
```

### TC-4.2: Country Code Validation
**Steps**:
1. Use browser DevTools to change country select value to "XX" (invalid)
2. Click "Continue"

**Verify**:
- [ ] Country field shows error: "Invalid country code"
- [ ] Form does not submit

### TC-4.3: Validation Clearing
**Steps**:
1. Trigger validation errors
2. Fill in a required field
3. Click "Continue" again

**Verify**:
- [ ] Previous error messages are cleared
- [ ] New validation runs
- [ ] Only unfilled fields show errors

## Test Suite 5: Form Submission

### TC-5.1: Successful Submission
**Steps**:
1. Fill all required fields with valid data:
   - First and last name: "John Doe"
   - Phone: "555-1234"
   - Company: "Test Company LLC"
   - ZIP: "12345"
   - Country: "US"
   - Tax ID: "12-3456789"
   - Cell Phone: "555-5678" (optional)
   - How did you hear: Select an option
   - Check "Accept marketing"
2. Open Network tab, filter by "customer/update"
3. Click "Continue"

**Verify**:
- [ ] Console shows: `[WholesaleTelemetry] wholesale_registration_submit`
- [ ] Network tab shows POST to `/storefront/api/v1/{storeId}/customer/update`
- [ ] Request includes `credentials: include`
- [ ] Response status is 200 OK
- [ ] Console shows: `[WholesaleTelemetry] wholesale_registration_success`
- [ ] Success message appears: "Registration submitted successfully!"
- [ ] Page redirects to `/products` after ~1.5 seconds
- [ ] Success banner appears at top: "Your wholesale registration has been submitted..."

**Request Payload Check**:
```javascript
// In Network tab, inspect request payload
{
  "updatedCustomer": {
    "name": "John Doe",
    "acceptMarketing": true,
    "billingPerson": {
      "name": "John Doe",
      "companyName": "Test Company LLC",
      "postalCode": "12345",
      "phone": "555-1234",
      "countryCode": "US"
    }
  },
  "checkout": {
    "extraFields": {
      "3w9kla3": {  // or "Tax ID"
        "title": "Tax ID",
        "value": "12-3456789"
      },
      // ... other extra fields
    },
    "removedExtraFieldsKeys": [],
    "extraFieldsPayload": {
      "mapToUpdate": { /* ... */ },
      "keysToRemove": [],
      "updateMode": "UPDATE_HIDDEN"
    }
  },
  "lang": "en"
}
```

**Verify Payload Contains**:
- [ ] `updatedCustomer.name`
- [ ] `updatedCustomer.acceptMarketing` (true or false)
- [ ] `updatedCustomer.billingPerson.name`
- [ ] `updatedCustomer.billingPerson.companyName`
- [ ] `updatedCustomer.billingPerson.postalCode`
- [ ] `updatedCustomer.billingPerson.phone`
- [ ] `updatedCustomer.billingPerson.countryCode`
- [ ] `checkout.extraFields` with Tax ID
- [ ] `checkout.extraFieldsPayload.updateMode: "UPDATE_HIDDEN"`

### TC-5.2: Submission Failure
**Steps**:
1. Disable network (or use DevTools to block request)
2. Fill form and click "Continue"

**Verify**:
- [ ] Console shows: `[WholesaleTelemetry] wholesale_registration_submit`
- [ ] Error message appears: "Registration failed. Please try again."
- [ ] Console shows: `[WholesaleTelemetry] wholesale_registration_failure`
- [ ] Form remains on page (no redirect)
- [ ] Form data is preserved (not cleared)

### TC-5.3: Email Not Editable
**Steps**:
1. Try to edit email field

**Verify**:
- [ ] Email field is disabled (cannot type)
- [ ] Email field has visual indication of being read-only (grayed out)
- [ ] Email value is NOT sent in update payload (verify in Network tab)

## Test Suite 6: SPA Navigation

### TC-6.1: Form Persistence with MutationObserver
**Steps**:
1. Navigate to `/products/account/register`
2. Wait for form to load
3. Use Ecwid's search or navigate within SPA (triggering OnPageLoaded)
4. Navigate back to `/products/account/register`

**Verify**:
- [ ] Form reappears correctly
- [ ] Fields are prefilled again
- [ ] No duplicate forms injected

### TC-6.2: Cleanup on Route Change
**Steps**:
1. Navigate to `/products/account/register`
2. Wait for form to load
3. Navigate away (e.g., to `/products` or a category)

**Verify**:
- [ ] `#account-register-root` element is removed
- [ ] MutationObserver is disconnected
- [ ] Original account page content is restored (if any)
- [ ] Banner reappears on other pages (if user is still non-wholesale)

**Console Check**:
```javascript
// After navigating away
console.log("Form still present:", !!document.getElementById("account-register-root"));
// Should output: false
```

### TC-6.3: Hash Navigation Support
**Steps**:
1. Navigate to `/#/account/register` (hash-based route)

**Verify**:
- [ ] Form loads correctly
- [ ] `isAccountRegisterPath()` returns true

**Console Check**:
```javascript
console.log("Is register path:", isAccountRegisterPath());
// Should output: true for both /products/account/register and /#/account/register
```

## Test Suite 7: Post-Submission Flow

### TC-7.1: Ecwid.refreshConfig() Called
**Steps**:
1. Submit registration successfully
2. Monitor console for Ecwid API calls

**Verify**:
- [ ] `Ecwid.refreshConfig()` is called after submission
- [ ] No JavaScript errors in console

### TC-7.2: Success Banner Display
**Steps**:
1. Submit registration successfully
2. Observe success banner

**Verify**:
- [ ] Green banner appears at top of page
- [ ] Banner text: "Your wholesale registration has been submitted. We will review your application and update your account shortly."
- [ ] Banner is fixed positioned at top
- [ ] Banner auto-dismisses after 8 seconds

**Console Check**:
```javascript
console.log("Success banner:", !!document.getElementById("wholesale-success-banner"));
// Should output: true immediately after redirect
```

### TC-7.3: Redirect to /products
**Steps**:
1. Submit registration successfully
2. Wait for redirect

**Verify**:
- [ ] URL changes to `/products` or `/products/`
- [ ] Product listing page loads
- [ ] Success banner is visible on products page

## Test Suite 8: Webhook/Automation Verification

### TC-8.1: Customer Data Saved
**Steps**:
1. Submit registration
2. Go to Ecwid Control Panel → Customers
3. Find the customer record

**Verify**:
- [ ] Customer name updated
- [ ] Billing person details updated (name, company, postal code, phone, country)
- [ ] Extra fields saved:
  - [ ] Tax ID value present
  - [ ] Cell Phone value present (if filled)
  - [ ] "How did you hear" value present
- [ ] Accept marketing preference saved

### TC-8.2: Group Assignment (Manual or Webhook)
**After webhook/automation processes the registration**

**Verify**:
- [ ] Customer assigned to "Wholesaler" group
- [ ] Customer membership visible in Ecwid Control Panel
- [ ] Customer can see this reflected on storefront:
  - [ ] `Ecwid.Customer.get()` shows `membership.name === "Wholesaler"`
  - [ ] Wholesale banner disappears
  - [ ] Prices remain visible

**Console Check**:
```javascript
Ecwid.Customer.get(c => {
  console.log("Membership:", c.membership?.name);
  console.log("Is Wholesaler:", c.membership?.name?.toLowerCase() === "wholesaler");
});
// After webhook runs, should output: Is Wholesaler: true
```

## Test Suite 9: Accessibility

### TC-9.1: Keyboard Navigation
**Steps**:
1. Navigate to registration form
2. Use Tab key to navigate through fields
3. Use Enter/Space to check checkbox
4. Use Enter on "Continue" button

**Verify**:
- [ ] All fields are keyboard accessible
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Can submit form with Enter key

### TC-9.2: Screen Reader Compatibility
**Use screen reader (NVDA, JAWS, VoiceOver)**

**Verify**:
- [ ] All labels are announced
- [ ] Required fields are indicated
- [ ] Error messages are announced when validation fails
- [ ] `aria-invalid` and `aria-describedby` link errors correctly

### TC-9.3: Error State Accessibility
**Steps**:
1. Trigger validation errors
2. Check with screen reader or inspect HTML

**Verify**:
- [ ] Each error has unique ID
- [ ] Input has `aria-invalid="true"`
- [ ] Input has `aria-describedby` pointing to error message
- [ ] Error message has class `.form__msg--error`

## Test Suite 10: Regression Testing

### TC-10.1: Category Banner Still Works
**Navigate to category with image and description**

**Verify**:
- [ ] Full-width banner displays with category image
- [ ] Category description overlays the image
- [ ] Banner styling correct (Cormorant Garamond font)

### TC-10.2: Product Tags Still Work
**Navigate to product with TAGS attribute**

**Verify**:
- [ ] Tags display below product description
- [ ] Tag links are clickable
- [ ] Clicking tag shows alert or redirects

### TC-10.3: Price Visibility Still Works
**Test all three user states**

**Verify**:
- [ ] Guest: No prices
- [ ] Logged-in non-wholesale: Prices visible
- [ ] Logged-in wholesale: Prices visible

## Test Suite 11: Edge Cases

### TC-11.1: Empty Extra Field Definitions
**Simulate missing ec.order.extraFields**

**Console**:
```javascript
delete window.ec.order.extraFields;
delete window.ec.checkout.extraFields;
// Then reload registration page
```

**Verify**:
- [ ] Fallback API call is made to customer/update
- [ ] Extra fields render with fallback definitions
- [ ] Tax ID, Cell Phone, How did you hear fields appear

### TC-11.2: Rapid Navigation (SPA Stress Test)
**Steps**:
1. Rapidly navigate: register → products → register → category → register

**Verify**:
- [ ] No duplicate forms
- [ ] No JavaScript errors
- [ ] Form always loads correctly
- [ ] Cleanup happens properly

### TC-11.3: Submit While Network Slow
**Steps**:
1. Use DevTools to throttle network to "Slow 3G"
2. Submit form

**Verify**:
- [ ] "Saving…" message shows
- [ ] Button remains clickable (per tasks.md)
- [ ] Eventually completes or times out gracefully
- [ ] No double-submission

## Test Checklist Summary

**Before Deployment**:
- [ ] All Test Suite 1 (Price Visibility) tests pass
- [ ] All Test Suite 2 (Banner) tests pass
- [ ] All Test Suite 3 (Form Display) tests pass
- [ ] All Test Suite 4 (Validation) tests pass
- [ ] All Test Suite 5 (Submission) tests pass
- [ ] All Test Suite 6 (SPA Navigation) tests pass
- [ ] All Test Suite 7 (Post-Submission) tests pass
- [ ] All Test Suite 9 (Accessibility) tests pass
- [ ] All Test Suite 10 (Regression) tests pass
- [ ] Webhook automation configured and tested (Suite 8)

**Console Warnings Allowed**:
- Warnings about missing optional fields
- Ecwid's own console logs

**Console Errors NOT Allowed**:
- Any JavaScript errors
- Failed API calls (except when testing error handling)
- Missing function errors

## Troubleshooting

### Form Doesn't Load
```javascript
// Check route detection
console.log("isAccountRegisterPath:", isAccountRegisterPath());
console.log("pathname:", window.location.pathname);
console.log("hash:", window.location.hash);

// Check container
console.log("Container:", document.querySelector(".ec-cart__body-inner"));
```

### Validation Not Working
```javascript
// Check form elements
console.log("Form:", document.getElementById("wr-acc-form"));
console.log("Submit button:", document.getElementById("wr-acc-submit"));

// Check event listeners
document.getElementById("wr-acc-submit")?.click(); // Should trigger validation
```

### Submission Fails
```javascript
// Check network in DevTools
// Verify credentials: include is set
// Check response for errors
// Verify store ID and endpoint URL
```

### Telemetry Not Firing
```javascript
// Check telemetry function
console.log("trackWholesaleEvent:", typeof window.trackWholesaleEvent);

// Manually trigger
window.trackWholesaleEvent("test_event", { test: true });
// Should see: [WholesaleTelemetry] test_event {test: true}
```

## Performance Benchmarks

**Expected Load Times**:
- Form initial load: < 500ms
- Field definition discovery: < 1s
- Form submission: 1-3s (network dependent)
- Redirect after success: ~1.5s

**Memory**:
- No memory leaks on repeated navigation
- Observer cleanup verified

---

## Final Sign-Off

**Tester**: _________________
**Date**: _________________
**Environment**: [ ] Staging [ ] Production
**All Critical Tests Passed**: [ ] Yes [ ] No
**Notes**: _____________________________
