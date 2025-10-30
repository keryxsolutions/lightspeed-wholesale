# Wholesale Registration — Tasks

Scope
- Implement the master PRD in docs/wholesale-registration-master.prd as incremental, verifiable changes to app.js and app.css.
- Preserve existing modules: Wholesale Price Visibility, Category Banner, Product Tag System.

Milestones
- M0: Foundations and feature flags
- M1: Backend client contracts
- M2: SPA lifecycle hooks, route detection, banner, and page shell
- M3: Form validation, submission, success flow
- M4: Polish, telemetry, non-regressions

Conventions
- Registration route: /wholesale-registration (hash-compatible)
- Wholesale group name: Wholesaler (backend resolves ID)
- Backend base: window.WHOLESALE_API_BASE or default constant
- Telemetry: console-backed helper

Repository Files
- app.js
- app.css
- docs/wholesale-registration-master.prd (reference)

Anchors in app.js for precise placement
- Wholesale Price Visibility section: `// Wholesale Price Visibility`
- Category Banner section: `// CATEGORY BANNER FUNCTIONALITY`
- Product Tag System section: `// PRODUCT TAG SYSTEM FUNCTIONALITY`
- On API loaded init: `Ecwid.OnAPILoaded.add(function () { ... });`

Note on tool usage
- Use delegate edit with REPOMARK scopes for in-place changes.
- Place scope markers BEFORE function/method/class definitions and keep minimal unchanged context.

---

M0 — Foundations and Feature Flags

T-00 Add global config, feature flags, helpers
- Goal: Centralize flags, API base, route detection, DOM helpers.
- Target: app.js (top area, after clientId declaration)
- Insert using delegate edit with a new utilities block.

JavaScript
```JavaScript
// REPOMARK:SCOPE: 1 - Add wholesale flags, API base, route helpers, and DOM utils after clientId
// Config and flags
const WHOLESALE_FLAGS = {
  ENABLE_WHOLESALE_REGISTRATION: true,
  ENABLE_WHOLESALE_BANNER: true
};

// Backend base URL (override via window.WHOLESALE_API_BASE)
const WHOLESALE_API_BASE =
  (window.WHOLESALE_API_BASE && String(window.WHOLESALE_API_BASE)) ||
  "https://your-backend.example.com";

// Route helpers (supports pathname and hash)
function isWholesaleRegistrationPath() {
  const p = window.location.pathname || "";
  const h = window.location.hash || "";
  return p === "/wholesale-registration" || /#\/?wholesale-registration/.test(h);
}
function toWholesaleRegistrationPath() {
  return "/wholesale-registration";
}

// DOM helpers (idempotent)
function ensureSingletonNode(id, createEl) {
  let el = document.getElementById(id);
  if (!el) {
    el = createEl();
    el.id = id;
    document.head.appendChild(el);
  }
  return el;
}
function removeNodeById(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}
```

Acceptance
- Flags and WHOLESALE_API_BASE available globally.
- isWholesaleRegistrationPath() returns true for both /wholesale-registration and #/wholesale-registration.

T-01 Expose price-visibility refresh trigger
- Goal: Allow post-registration refresh without duplicating listeners.
- Target: app.js in Wholesale Price Visibility section, after update logic exists.
- Add a safe global function that re-runs visibility and refreshes Ecwid config.

JavaScript
```JavaScript
// REPOMARK:SCOPE: 2 - Expose window.triggerWholesaleVisibilityRefresh after wholesale visibility is defined
try {
  window.triggerWholesaleVisibilityRefresh = function () {
    if (!window.Ecwid || !Ecwid.Customer || typeof Ecwid.Customer.get !== "function") return;
    Ecwid.Customer.get(function () {
      // Reuse existing logic by simulating page load
      if (typeof Ecwid.refreshConfig === "function") Ecwid.refreshConfig();
    });
  };
} catch (e) {
  console.warn("Wholesale: Could not expose visibility refresh", e);
}
```

Acceptance
- Calling window.triggerWholesaleVisibilityRefresh completes without errors and causes Ecwid.refreshConfig().

---

M1 — Backend Client Contracts

T-10 Implement backend client functions
- Goal: Define fetch wrappers for status and registration calls.
- Target: app.js (new section after waitForEcwidAndTokens)

JavaScript
```JavaScript
// REPOMARK:SCOPE: 3 - Add wholesale backend client (status + register) after waitForEcwidAndTokens
// WHOLESALE BACKEND CLIENT
async function getWholesaleStatus(customerId) {
  const url = `${WHOLESALE_API_BASE}/api/wholesale/status?customerId=${encodeURIComponent(customerId)}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Status check failed");
  return res.json();
}

async function postWholesaleRegistration(payload) {
  const url = `${WHOLESALE_API_BASE}/api/wholesale/register`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || "Registration failed");
  }
  return data;
}
```

Acceptance
- getWholesaleStatus and postWholesaleRegistration return Promises and throw on non-2xx.

---

M2 — SPA Hooks, Route Detection, Banner, Page Shell

T-20 Initialize wholesale registration module during API load
- Goal: Hook into Ecwid lifecycle without breaking existing initializers.
- Target: app.js (inside Ecwid.OnAPILoaded.add callback)
- Add initializeWholesaleRegistration() call after existing initializers.

JavaScript
```JavaScript
// REPOMARK:SCOPE: 4 - Call initializeWholesaleRegistration() inside Ecwid.OnAPILoaded.add callback
// Initialize wholesale registration module
initializeWholesaleRegistration();
```

Acceptance
- No duplicate initialization across navigations.

T-21 Add wholesale registration module shell
- Goal: Detect login, handle redirects, and render banner/registration page.
- Target: app.js (new section near the bottom, after Product Tag System functions)

JavaScript
```JavaScript
// REPOMARK:SCOPE: 5 - Add WHOLESALE REGISTRATION MODULE with init, handlers, and helpers
// WHOLESALE REGISTRATION MODULE
function initializeWholesaleRegistration() {
  if (!WHOLESALE_FLAGS.ENABLE_WHOLESALE_REGISTRATION) return;
  // Initial run
  const last = window.Ecwid && Ecwid.getLastLoadedPage && Ecwid.getLastLoadedPage();
  if (last) handleWholesaleRegistrationOnPage(last);
  // SPA navigation
  Ecwid.OnPageLoaded.add(handleWholesaleRegistrationOnPage);
}

function fetchLoggedInCustomer() {
  return new Promise((resolve) => {
    if (!window.Ecwid || !Ecwid.Customer || typeof Ecwid.Customer.get !== "function") return resolve(null);
    Ecwid.Customer.get((c) => resolve(c && c.email ? c : null));
  });
}

async function handleWholesaleRegistrationOnPage(page) {
  try {
    const onReg = isWholesaleRegistrationPath();
    const customer = await fetchLoggedInCustomer();

    // Page class hygiene
    if (!onReg) {
      document.body.classList.remove("wholesale-registration-page");
      removeNodeById("wholesale-registration-hide-css");
      removeNodeById("wholesale-registration-root");
    }

    // Banner behavior
    await renderWholesaleBanner({ customer, onReg });

    if (customer) {
      if (!onReg) {
        // Redirect if not approved yet
        const status = await getWholesaleStatus(customer.id).catch(() => null);
        if (status && !status.isWholesaleApproved) {
          window.location.href = toWholesaleRegistrationPath();
          return;
        }
      } else {
        // On registration page: render and force-hide prices
        renderWholesaleRegistrationPage(customer);
        forceHidePricesOnRegistration(true);
        return;
      }
    } else {
      // Guest handling
      if (onReg) {
        renderWholesaleRegistrationPage(null);
        forceHidePricesOnRegistration(true);
      } else {
        forceHidePricesOnRegistration(false);
      }
    }
  } catch (e) {
    console.warn("Wholesale Reg: handler error", e);
  }
}
```

Acceptance
- Logged-in, non-wholesale users are redirected to /wholesale-registration.
- Banner rendered for guests and non-wholesale (not on the registration page).
- Registration page adds body class and hides price UI.

T-22 Forced price hide on registration page
- Goal: Ensure price and buy UI are hidden on the registration page.
- Target: app.js (utility function used by T-21)

JavaScript
```JavaScript
// REPOMARK:SCOPE: 6 - Add forceHidePricesOnRegistration utility (injects scoped CSS + body class)
function forceHidePricesOnRegistration(on) {
  const id = "wholesale-registration-hide-css";
  if (!on) {
    document.body.classList.remove("wholesale-registration-page");
    removeNodeById(id);
    return;
  }
  ensureSingletonNode(id, () => {
    const s = document.createElement("style");
    s.textContent = `
      body.wholesale-registration-page .details-product-purchase__controls,
      body.wholesale-registration-page .ec-filter--price,
      body.wholesale-registration-page .ecwid-productBrowser-price,
      body.wholesale-registration-page .ecwid-price-value,
      body.wholesale-registration-page .ecwid-btn--add-to-cart,
      body.wholesale-registration-page .ecwid-add-to-cart-button-container,
      body.wholesale-registration-page .product-card-buy-icon,
      body.wholesale-registration-page .ec-filter__item--price,
      body.wholesale-registration-page .ec-price-filter { display: none !important; }
    `;
    return s;
  });
  document.body.classList.add("wholesale-registration-page");
}
```

Acceptance
- On registration page, prices/buy buttons are not visible regardless of login.

T-23 Banner rendering with status-aware visibility
- Goal: Show banner globally except on registration page and for wholesale-approved users.
- Target: app.js (new function + status cache)
- Also requires CSS in app.css (see T-24).

JavaScript
```JavaScript
// REPOMARK:SCOPE: 7 - Add banner rendering with status cache and telemetry
const WHOLESALE_STATUS_CACHE = { customerId: null, isWholesaleApproved: null };

async function shouldShowRegistrationBanner(customer, onReg) {
  if (!WHOLESALE_FLAGS.ENABLE_WHOLESALE_BANNER || onReg) return false;
  if (!customer) return true;
  if (WHOLESALE_STATUS_CACHE.customerId === customer.id && WHOLESALE_STATUS_CACHE.isWholesaleApproved != null) {
    return !WHOLESALE_STATUS_CACHE.isWholesaleApproved;
  }
  const status = await getWholesaleStatus(customer.id).catch(() => null);
  if (status) {
    WHOLESALE_STATUS_CACHE.customerId = customer.id;
    WHOLESALE_STATUS_CACHE.isWholesaleApproved = !!status.isWholesaleApproved;
    return !status.isWholesaleApproved;
  }
  return true; // fail-open to show prompt
}

async function renderWholesaleBanner({ customer, onReg }) {
  const show = await shouldShowRegistrationBanner(customer, onReg);
  const id = "wholesale-registration-banner";
  if (!show) return removeNodeById(id);

  const container = document.querySelector(".ecwid-productBrowser") || document.body;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.className = "wholesale-registration-banner";
    container.prepend(el);
  }
  el.innerHTML = [
    '<div class="wholesale-banner-content">',
    '<span>Register to access prices and place an order.</span>',
    `<a class="wholesale-banner-link" href="${toWholesaleRegistrationPath()}">Register</a>`,
    "</div>"
  ].join("");

  const link = el.querySelector(".wholesale-banner-link");
  if (link) {
    link.addEventListener("click", function () {
      emitTelemetry("wholesale_banner_click");
    }, { once: true });
  }
  emitTelemetry("wholesale_banner_shown");
}
```

Acceptance
- Banner hidden on registration page and for wholesale-approved users.
- Console logs telemetry events for shown/click.

T-24 Add CSS for banner and registration form container
- Goal: Provide basic styles for visibility and readability.
- Target: app.css (append styles)

CSS
```CSS
/* Wholesale registration banner */
.wholesale-registration-banner {
  background: #0b5fff;
  color: #fff;
  padding: 12px 16px;
  border-radius: 6px;
  margin: 12px 0;
}
.wholesale-registration-banner .wholesale-banner-content {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  font-weight: 600;
}
.wholesale-registration-banner .wholesale-banner-link {
  color: #fff;
  text-decoration: underline;
}
.wholesale-registration-banner .wholesale-banner-link:hover {
  text-decoration: none;
}

/* Registration form container */
.wholesale-registration-form {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 16px;
  margin: 12px 0;
}
.wholesale-registration-form .wr-title { margin: 0 0 12px; font-size: 1.5em; }
.wholesale-registration-form .wr-field { margin-bottom: 10px; display: flex; flex-direction: column; }
.wholesale-registration-form .wr-field > label { font-weight: 600; margin-bottom: 4px; }
.wholesale-registration-form .wr-field > input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
.wholesale-registration-form .wr-field > input[aria-invalid="true"] { border-color: #d93025; }
.wholesale-registration-form .wr-hint { color: #666; font-size: 12px; }
.wholesale-registration-form .wr-checkbox { flex-direction: row; align-items: center; gap: 8px; }
.wholesale-registration-form .wr-actions { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
.wholesale-registration-form .wr-error { color: #d93025; font-weight: 600; }
```

Acceptance
- Banner and form styles apply without interfering with existing styles.

T-25 Render registration page shell with prefill
- Goal: Render form with fields specified in PRD and prefill from Ecwid.Customer.get.
- Target: app.js (new function)

JavaScript
```JavaScript
// REPOMARK:SCOPE: 8 - Add renderWholesaleRegistrationPage with prefilled fields and handlers
function renderWholesaleRegistrationPage(customer) {
  const container =
    document.querySelector(".ecwid-productBrowser") ||
    document.querySelector(".ec-page") ||
    document.body;

  let root = document.getElementById("wholesale-registration-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "wholesale-registration-root";
    root.className = "wholesale-registration-form";
    container.prepend(root);
  }

  const email = (customer && customer.email) || "";
  const bp = (customer && customer.billingPerson) || {};
  const marketing = !!(customer && customer.acceptMarketing);

  root.innerHTML = `
    <h1 class="wr-title">Wholesale Registration</h1>
    <form id="wr-form" novalidate>
      <div class="wr-field">
        <label>Email *</label>
        <input type="email" name="email" value="${email}" readonly aria-readonly="true"/>
        <small class="wr-hint">Sign in to use a different email.</small>
      </div>
      <div class="wr-field"><label>Name *</label><input name="name" required value="${bp.name || ""}"/></div>
      <div class="wr-field"><label>Company name *</label><input name="companyName" required value="${bp.companyName || ""}"/></div>
      <div class="wr-field"><label>Country (ISO 2) *</label><input name="countryCode" required pattern="^[A-Z]{2}$" value="${bp.countryCode || ""}"/></div>
      <div class="wr-field"><label>Postal code *</label><input name="postalCode" required value="${bp.postalCode || ""}"/></div>
      <div class="wr-field"><label>Phone *</label><input name="phone" required type="tel" value="${bp.phone || ""}"/></div>
      <div class="wr-field"><label>Cell Phone</label><input name="cellPhone" type="tel"/></div>
      <div class="wr-field"><label>Tax ID *</label><input name="taxId" required/></div>
      <div class="wr-field"><label>How did you hear about us?</label><input name="referralSource"/></div>
      <div class="wr-field wr-checkbox">
        <label><input type="checkbox" name="acceptMarketing" ${marketing ? "checked" : ""}/> Subscribe to newsletter</label>
      </div>
      <div class="wr-actions">
        <button type="submit" id="wr-submit" disabled>Submit</button>
        <span id="wr-error" class="wr-error" role="status" aria-live="polite"></span>
      </div>
    </form>
  `;
  wireRegistrationFormHandlers(customer);
  emitTelemetry("wholesale_registration_view");
}
```

Acceptance
- Email is read-only when logged-in; all required fields present; form container visible.

---

M3 — Validation, Submission, Success Flow

T-30 Client-side validation and form wiring
- Goal: Validate inputs, manage submit state, and post to backend.
- Target: app.js (new functions)

JavaScript
```JavaScript
// REPOMARK:SCOPE: 9 - Add validateForm and wireRegistrationFormHandlers with submission to backend
function validateForm(form) {
  const v = (n) => (form.elements[n] && form.elements[n].value || "").trim();
  const errors = {};
  if (!v("email")) errors.email = "Email required";
  if (!v("name")) errors.name = "Name required";
  if (!v("companyName")) errors.companyName = "Company name required";
  if (!/^[A-Z]{2}$/.test(v("countryCode").toUpperCase())) errors.countryCode = "Use ISO 2 (e.g., US)";
  if (!v("postalCode")) errors.postalCode = "Postal code required";
  if (!v("phone")) errors.phone = "Phone required";
  if (!v("taxId")) errors.taxId = "Tax ID required";
  return { valid: Object.keys(errors).length === 0, errors };
}

function wireRegistrationFormHandlers(customer) {
  const form = document.getElementById("wr-form");
  const submit = document.getElementById("wr-submit");
  const errorEl = document.getElementById("wr-error");

  const onInput = () => {
    const { valid, errors } = validateForm(form);
    submit.disabled = !valid;
    Array.from(form.elements).forEach((el) => {
      if (el && el.name) el.setAttribute("aria-invalid", errors[el.name] ? "true" : "false");
    });
    errorEl.textContent = Object.values(errors)[0] || "";
  };

  form.addEventListener("input", onInput);
  form.addEventListener("change", onInput);
  onInput();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const { valid } = validateForm(form);
    if (!valid) return onInput();

    const fd = new FormData(form);
    const payload = {
      storeId: window.Ecwid && Ecwid.getOwnerId && Ecwid.getOwnerId(),
      customerId: customer && customer.id,
      email: (customer && customer.email) || String(fd.get("email") || "").trim(),
      name: String(fd.get("name") || "").trim(),
      companyName: String(fd.get("companyName") || "").trim(),
      countryCode: String(fd.get("countryCode") || "").trim().toUpperCase(),
      postalCode: String(fd.get("postalCode") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      cellPhone: String(fd.get("cellPhone") || "").trim(),
      taxId: String(fd.get("taxId") || "").trim(),
      referralSource: String(fd.get("referralSource") || "").trim(),
      acceptMarketing: !!(form.acceptMarketing && form.acceptMarketing.checked)
    };

    submit.disabled = true;
    emitTelemetry("wholesale_registration_submit");

    try {
      await postWholesaleRegistration(payload);
      await afterRegistrationSuccess(customer);
    } catch (err) {
      emitTelemetry("wholesale_registration_failure");
      errorEl.textContent = (err && err.message) || "Registration failed. Please try again.";
      submit.disabled = false;
    }
  });
}
```

Acceptance
- Submit button disabled until valid; first error shown; errors update aria-invalid attributes.

T-31 Success flow: status re-check, UI refresh, redirect
- Goal: Confirm approval, refresh visibility, redirect to /products.
- Target: app.js (new function)

JavaScript
```JavaScript
// REPOMARK:SCOPE: 10 - Add afterRegistrationSuccess to confirm approval, refresh UI, and redirect
async function afterRegistrationSuccess(customer) {
  const status = customer ? await getWholesaleStatus(customer.id).catch(() => null) : null;
  if (status && status.isWholesaleApproved) {
    try {
      if (typeof window.triggerWholesaleVisibilityRefresh === "function") {
        window.triggerWholesaleVisibilityRefresh();
      } else if (typeof window.Ecwid !== "undefined" && typeof Ecwid.refreshConfig === "function") {
        Ecwid.refreshConfig();
      }
    } catch (e) {}
  }
  emitTelemetry("wholesale_registration_success");
  window.location.href = "/products";
}
```

Acceptance
- On success, user is redirected to /products; config refresh is attempted first.

---

M4 — Telemetry, Non-Regression, Cleanup

T-40 Telemetry helper
- Goal: Centralize event logging.
- Target: app.js (utilities area)

JavaScript
```JavaScript
// REPOMARK:SCOPE: 11 - Add minimal telemetry helper
function emitTelemetry(eventName, payload = {}) {
  try {
    console.log("[telemetry]", eventName, payload);
  } catch (e) {}
}
```

Acceptance
- Events print to console without errors.

T-41 Remove registration page artifacts on navigation
- Goal: Prevent lingering styles/containers when leaving registration route.
- Covered in T-21 hygiene block; verify behavior.
- No extra code if T-21 implemented.

Acceptance
- Navigating away removes body class, injected CSS, and root container.

---

Test Plan (Happy Path)
1) As guest:
- Navigate anywhere: Banner is visible with correct copy and link.
- Click Register: Lands on /wholesale-registration; price UI hidden.

2) As logged-in non-wholesale:
- Visit any page: Redirects to /wholesale-registration.
- Form is prefilled; Submit disabled until required fields valid.
- Submit: If backend returns success, you’re redirected to /products.

3) As logged-in wholesale:
- No redirect; no banner; prices visible (per existing logic on non-reg pages).

Error Handling
- Backend 4xx/5xx: Error appears inline, Submit re-enabled, form values preserved.

Acceptance Criteria Mapping
- AC‑1: T-23, T-24
- AC‑2: T-21
- AC‑3: T-22
- AC‑4: T-30 (payload fields), backend aligns with PRD
- AC‑5: T-31
- AC‑6: T-23 (status-aware banner)
- AC‑7: T-30 (inline error + retry)

Risks & Mitigations
- Excessive status calls → Use WHOLESALE_STATUS_CACHE (T-23).
- DOM variance across themes → Multi-selector container fallback (T-25).
- Double initialization → Init only in Ecwid.OnAPILoaded, SPA events handled in T-21.

Done Definition
- All tasks merged; no console errors.
- Visual check: banner and form render; validation works.
- Basic telemetry logs appear on shown/click/view/submit/success/failure.

---

## Addendum — Ecwid REST Refactor (M1R–M4R)

Context
- PRD v1.0 (docs/wholesale-registration-master.prd) now mandates using Ecwid REST API directly (no custom backend).
- This addendum is additive to M0/M1 already implemented; it replaces backend calls and cleans up legacy code.

Conventions (updates)
- Wholesale group name: Wholesaler (override via window.WHOLESALE_GROUP_NAME)
- REST base: https://app.ecwid.com/api/v3/${storeId}
- Auth: Ecwid.getAppPublicToken(clientId) via waitForEcwidAndTokens()

Anchors in app.js remain:
- waitForEcwidAndTokens()
- Wholesale Price Visibility
- CATEGORY BANNER FUNCTIONALITY
- PRODUCT TAG SYSTEM FUNCTIONALITY

---

M1R — Replace custom backend with Ecwid REST client

T-12 Ecwid REST client and constants
- Goal: Centralize Ecwid REST calls with token handling and basic error mapping.
- Target: app.js (immediately after waitForEcwidAndTokens)

JavaScript
```JavaScript
function getWholesaleGroupName() {
  return (window.WHOLESALE_GROUP_NAME && String(window.WHOLESALE_GROUP_NAME)) || "Wholesaler";
}

const WHOLESALE_CACHE = {
  groupId: null,
  extraFieldKeysByTitle: {} // title -> key
};

async function ecwidFetchJSON(path, options = {}) {
  const { storeId, publicToken } = await waitForEcwidAndTokens();
  const url = `https://app.ecwid.com/api/v3/${storeId}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${publicToken}`,
      "Content-Type": "application/json"
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.errorMessage || data.message || `${res.status} ${res.statusText}`;
    const err = new Error(`Ecwid API error: ${msg}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}
```

Acceptance
- ecwidFetchJSON performs authorized JSON calls and throws with message on non-2xx.

T-13 Wholesale status via Ecwid REST
- Goal: Replace getWholesaleStatus(customerId) with a direct REST getter and group name match.
- Target: app.js (replace existing getWholesaleStatus)

JavaScript
```JavaScript
async function ecwidGetWholesaleStatus(customerId) {
  if (!customerId) return { isWholesaleApproved: false };
  const customer = await ecwidFetchJSON(`/customers/${encodeURIComponent(customerId)}`, { method: "GET" });
  const groupId = customer.customerGroupId || null;
  const groupName = (customer.customerGroup && customer.customerGroup.name) || null;
  const isWholesaleApproved = !!groupId && (groupName === getWholesaleGroupName());
  return { isWholesaleApproved, groupId, groupName };
}
```

Acceptance
- Returns { isWholesaleApproved, groupId?, groupName? } and never calls WHOLESALE_API_BASE.

T-14 Resolve wholesale group ID by name (cache)
- Goal: Map "Wholesaler" to groupId. Cache the result.
- Target: app.js (new helper)

JavaScript
```JavaScript
async function ecwidGetWholesaleGroupIdByName(name = getWholesaleGroupName()) {
  if (WHOLESALE_CACHE.groupId) return WHOLESALE_CACHE.groupId;
  const data = await ecwidFetchJSON(`/customer_groups`, { method: "GET" });
  const list = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
  const match = list.find((g) => g && g.name === name);
  if (!match) throw new Error(`Wholesale group not found: ${name}`);
  WHOLESALE_CACHE.groupId = match.id;
  return match.id;
}
```

Acceptance
- Subsequent calls return cached id; throws if group not found.

T-15 Ensure Customer Extra Fields exist and collect keys
- Goal: Guarantee titles exist and map title → key in cache.
- Target: app.js (new helpers)

JavaScript
```JavaScript
async function ecwidListCustomerExtraFields() {
  const data = await ecwidFetchJSON(`/store_extrafields/customers`, { method: "GET" });
  const items = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
  items.forEach((f) => {
    if (f && f.title && f.key) WHOLESALE_CACHE.extraFieldKeysByTitle[f.title] = f.key;
  });
  return WHOLESALE_CACHE.extraFieldKeysByTitle;
}

async function ecwidEnsureCustomerExtraFields(titles = []) {
  await ecwidListCustomerExtraFields();
  for (const title of titles) {
    if (!WHOLESALE_CACHE.extraFieldKeysByTitle[title]) {
      const created = await ecwidFetchJSON(`/store_extrafields/customers`, {
        method: "POST",
        body: JSON.stringify({ title })
      });
      if (created && created.key) {
        WHOLESALE_CACHE.extraFieldKeysByTitle[title] = created.key;
      }
    }
  }
  return WHOLESALE_CACHE.extraFieldKeysByTitle;
}
```

Acceptance
- Missing titles are created and reflected in WHOLESALE_CACHE.extraFieldKeysByTitle.

T-16 Submit wholesale registration via Ecwid REST
- Goal: Replace postWholesaleRegistration(...) with direct REST update and group assignment.
- Target: app.js (new function; update call sites in M3R)

JavaScript
```JavaScript
async function ecwidSubmitWholesaleRegistration(payload) {
  const {
    customerId, email, name, companyName, countryCode,
    postalCode, phone, cellPhone, taxId, referralSource,
    acceptMarketing
  } = payload || {};
  if (!customerId || !email) throw new Error("Missing customer identity");

  const keys = await ecwidEnsureCustomerExtraFields(["Tax ID", "How did you hear about us?", "Cell Phone"]);
  const groupId = await ecwidGetWholesaleGroupIdByName();

  const extraFields = [];
  if (taxId) extraFields.push({ key: keys["Tax ID"], value: String(taxId) });
  if (referralSource) extraFields.push({ key: keys["How did you hear about us?"], value: String(referralSource) });
  if (cellPhone) extraFields.push({ key: keys["Cell Phone"], value: String(cellPhone) });

  const updateBody = {
    billingPerson: {
      name: String(name || ""),
      companyName: String(companyName || ""),
      countryCode: String(countryCode || "").toUpperCase(),
      postalCode: String(postalCode || ""),
      phone: String(phone || "")
    },
    acceptMarketing: !!acceptMarketing,
    customerGroupId: groupId,
    ...(extraFields.length ? { extraFields } : {})
  };

  await ecwidFetchJSON(`/customers/${encodeURIComponent(customerId)}`, {
    method: "PUT",
    body: JSON.stringify(updateBody)
  });
  return { success: true };
}
```

Acceptance
- On success returns { success: true } and assigns group via PUT.

T-17 Update banner/status consumers to use Ecwid REST
- Goal: Migrate shouldShowRegistrationBanner and handler to ecwidGetWholesaleStatus.
- Target: app.js (existing wholesale registration module)

Instructions
- Replace calls to getWholesaleStatus(...) with ecwidGetWholesaleStatus(...).
- Keep WHOLESALE_STATUS_CACHE but store { isWholesaleApproved } from Ecwid REST.
- Remove any dependency on WHOLESALE_API_BASE in banner/status logic.

---

M2R — Tokens/scopes error handling

T-20R Surface 401/403 errors with actionable UI
- Goal: Show clear errors when token lacks required scopes.
- Target: app.js (wireRegistrationFormHandlers and registration render flow)

JavaScript
```JavaScript
// In handleWholesaleRegistrationOnPage and shouldShowRegistrationBanner:
const status = await ecwidGetWholesaleStatus(customer.id).catch((e) => {
  if (e && (e.status === 401 || e.status === 403)) {
    console.warn("Ecwid token lacks required scopes");
  }
  return null;
});

// In wireRegistrationFormHandlers submit catch:
if (err && (err.status === 401 || err.status === 403)) {
  errorEl.textContent = "Store authorization is not available. Please contact support.";
} else {
  errorEl.textContent = (err && err.message) || "Registration failed. Please try again.";
}
```

Acceptance
- 401/403 shows friendly message; other errors show generic failure; Submit re-enabled.

---

M3R — Swap call sites to REST helpers

T-30R Wire submission to ecwidSubmitWholesaleRegistration
- Goal: Replace backend call with direct REST flow.
- Target: app.js (wireRegistrationFormHandlers)

Instructions
- Replace:
  - await postWholesaleRegistration(payload)
- With:
  - await ecwidSubmitWholesaleRegistration(payload)

T-31R Success re-check via Ecwid REST
- Goal: Confirm approval post-submit, then redirect.
- Target: app.js (afterRegistrationSuccess)

Instructions
- Replace:
  - const status = await getWholesaleStatus(customer.id)
- With:
  - const status = await ecwidGetWholesaleStatus(customer.id)

Acceptance
- Redirect logic unchanged; uses REST status check.

---

M4R — Cleanup and deprecation

T-40R Remove custom backend artifacts
- Goal: Eliminate unused constants and functions.
- Target: app.js

Instructions
- Remove WHOLESALE_API_BASE constant if unused after refactor.
- Remove getWholesaleStatus(...) and postWholesaleRegistration(...) legacy implementations.
- Ensure no remaining references in code.

Acceptance
- No references to WHOLESALE_API_BASE, getWholesaleStatus, or postWholesaleRegistration remain.
- Lint/console show no related errors.

---

Test Plan (delta)
- Logged-in, non-wholesale:
  - Redirect still occurs; status derived from Ecwid REST.
- Registration submit:
  - Creates missing extra fields if needed, assigns group, and redirects to /products.
- Error cases:
  - 401/403 shows authorization message on registration page.
  - Network/validation failures show inline error; form values preserved.

Done Definition (delta)
- All REST helpers present; backend calls removed.
- Banner/status/submit flows use Ecwid REST exclusively.

---

M5 — Server Proxy Integration (Admin REST via secret token)

Context
- Admin REST calls require a secret token and must be executed server-side. The storefront must never expose the secret token.
- Introduce a minimal proxy service that wraps Ecwid Admin REST operations needed for wholesale registration.

Conventions
- WHOLESALE_API_BASE: server origin, e.g., https://api.example.com
- Storefront → Server auth: CORS allowlist + Origin check, header `X-App-Client: <clientId>`, and `storeId` validation.
- CSRF: SameSite cookies and a double-submit token for POST requests.
- Server → Ecwid: use secret token with scopes: read/update customers, read/update customers_extrafields, read customer_groups.

Tasks
- P-00 Design & Security
  - Define endpoints and security controls.
  - Environment variables: ECWID_SECRET_TOKEN, STORE_ID, WHOLESALE_GROUP_NAME (default "Wholesaler").

- P-10 Endpoint: GET /api/wholesale/status
  - Params: customerId, storeId
  - Logic: GET customer, resolve wholesale group by name, return `{ isWholesaleApproved, groupId?, groupName? }`.

- P-20 Endpoint: POST /api/wholesale/register
  - Body: `{ storeId, customerId, email, name, companyName, countryCode, postalCode, phone, cellPhone?, taxId, referralSource?, acceptMarketing }`
  - Logic: ensure extra fields, resolve group ID, PUT customer update with group assignment, return `{ success: true }`.

- P-30 Deployment & Config
  - Deploy HTTPS server, set WHOLESALE_API_BASE in storefront, configure CORS allowlist.

- P-31 Select serverless hosting (GitHub Pages is static-only)
  - Choose a platform that can run server code and protect secrets (e.g., Cloudflare Workers, Netlify Functions, Vercel Functions, AWS Lambda/API Gateway).
  - Rationale: GitHub Pages cannot execute server code or store the Ecwid secret token securely.

- P-40 Frontend Integration (app.js)
  - Prefer JS membership (`customer.membership.name`) on storefront for status.
  - Call server `/status` only when JS data is inconclusive; call server `/register` on submit.
  - Keep direct REST fallback for local/dev only.

- P-41 Frontend hardening (server-only for private REST)
  - Remove direct Ecwid Admin REST fallback from app.js (delete `ecwidGetWholesaleStatusDirect` and `ecwidSubmitWholesaleRegistrationDirect`).
  - Ensure all private operations route exclusively through the server proxy.

- P-50 QA & Errors
  - Surface 401/403 with friendly messages in UI; retryable failures preserve form input.

Acceptance
- Non-public Ecwid ops (status/registration) occur via server proxy.
- app.js uses server endpoints with membership-first logic; direct REST only as fallback.
- Security controls verified on server (CORS, CSRF, headers, rate limits).