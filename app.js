/* Lightspeed eCom Custom App JS - Wholesale Portal */

/* This script assumes that product prices are turned OFF by default in the store's design settings. */
/* Added category banner functionality for full-width banners with text overlay. */

// App client ID (from your Ecwid app). Uses a single constant per docs.
const clientId = "custom-app-121843055-1";

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

const WHOLESALE_TELEMETRY = { sent: new Set(), max: 200 };
function trackWholesaleEvent(name, props) {
  try {
    const p = props || {};
    const route = { path: window.location.pathname || "", hash: window.location.hash || "" };
    const key = name + "|" + JSON.stringify({ ...p, route });
    if (WHOLESALE_TELEMETRY.sent.has(key)) return;
    WHOLESALE_TELEMETRY.sent.add(key);
    if (WHOLESALE_TELEMETRY.sent.size > WHOLESALE_TELEMETRY.max) { WHOLESALE_TELEMETRY.sent.clear(); }
    console.log("[WholesaleTelemetry]", name, p);
  } catch (_) {}
}
try { window.trackWholesaleEvent = trackWholesaleEvent; } catch (_) {}

Ecwid.OnAPILoaded.add(function () {
  // Initialize robust wholesale price visibility logic
  initializeWholesalePriceVisibility();

  // Initialize category banner functionality (preserved)
  initializeCategoryBanner();

  // Initialize product tag system
  initializeProductTagSystem();

  // Initialize wholesale registration (routing, banner, page shell)
  initializeWholesaleRegistration();
});

/*****************************************************************************/

// Top-level helper: wait for Ecwid API readiness and resolve storeId + public token
function waitForEcwidAndTokens(maxAttempts = 60, interval = 250) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    (function tick() {
      const hasEcwid = !!window.Ecwid;
      const hasOwnerId = hasEcwid && typeof Ecwid.getOwnerId === "function";
      const hasPublicToken =
        hasEcwid && typeof Ecwid.getAppPublicToken === "function";
      if (hasOwnerId && hasPublicToken) {
        try {
          const storeId = Ecwid.getOwnerId();
          const token = Ecwid.getAppPublicToken(clientId);
          resolve({ storeId, publicToken: token });
        } catch (e) {
          reject(e);
        }
        return;
      }
      if (attempts++ < maxAttempts) {
        setTimeout(tick, interval);
      } else {
        reject(new Error("Ecwid API not ready: getOwnerId/getAppPublicToken"));
      }
    })();
  });
}

/*****************************************************************************/

function getWholesaleGroupName() {
  return (window.WHOLESALE_GROUP_NAME && String(window.WHOLESALE_GROUP_NAME)) || "Wholesale Customer";
}

const WHOLESALE_CACHE = {
  groupId: null,
  extraFieldKeysByTitle: {}
};

async function ecwidFetchJSON(path, options) {
  const { storeId, publicToken } = await waitForEcwidAndTokens();
  const url = `https://app.ecwid.com/api/v3/${storeId}${path}`;
  const init = options || {};
  const headers = Object.assign(
    { Authorization: `Bearer ${publicToken}`, "Content-Type": "application/json" },
    init.headers || {}
  );
  const res = await fetch(url, Object.assign({}, init, { headers }));
  if (!res.ok) throw new Error(`Ecwid API error ${res.status} for ${path}`);
  return res.json();
}

async function resolveWholesaleGroupId() {
  if (WHOLESALE_CACHE.groupId) return WHOLESALE_CACHE.groupId;
  const data = await ecwidFetchJSON("/customer_groups", { method: "GET" });
  const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
  const targetName = getWholesaleGroupName().toLowerCase();
  const match = items.find(g => g && typeof g.name === "string" && g.name.toLowerCase() === targetName);
  WHOLESALE_CACHE.groupId = match ? match.id : null;
  return WHOLESALE_CACHE.groupId;
}

async function ensureExtraFieldKeyByTitle(title) {
  const t = String(title || "").trim();
  if (!t) return null;
  if (WHOLESALE_CACHE.extraFieldKeysByTitle[t]) return WHOLESALE_CACHE.extraFieldKeysByTitle[t];

  const data = await ecwidFetchJSON("/store_extrafields/customers", { method: "GET" });
  const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
  const found = items.find(f => f && typeof f.title === "string" && f.title.trim().toLowerCase() === t.toLowerCase());
  if (found && found.key) {
    WHOLESALE_CACHE.extraFieldKeysByTitle[t] = found.key;
    return found.key;
  }

  const created = await ecwidFetchJSON("/store_extrafields/customers", {
    method: "POST",
    body: JSON.stringify({ title: t })
  });
  const key = created && created.key;
  if (key) {
    WHOLESALE_CACHE.extraFieldKeysByTitle[t] = key;
    return key;
  }
  return null;
}

function buildCustomerUpdatePayload(values) {
  const extraFields = {};
  const ef = WHOLESALE_CACHE.extraFieldKeysByTitle;
  if (ef["Cell Phone"] && values.cellPhone) extraFields[ef["Cell Phone"]] = String(values.cellPhone);
  if (ef["Tax ID"] && values.taxId) extraFields[ef["Tax ID"]] = String(values.taxId);
  if (ef["Referral Source"] && values.referralSource) extraFields[ef["Referral Source"]] = String(values.referralSource);

  const payload = {
    email: values.email,
    acceptMarketing: !!values.acceptMarketing,
    billingPerson: {
      name: values.name || "",
      companyName: values.companyName || "",
      countryCode: (values.countryCode || "").toUpperCase(),
      postalCode: values.postalCode || "",
      phone: values.phone || ""
    },
    extraFields: extraFields
  };

  if (WHOLESALE_CACHE.groupId) {
    payload.customerGroupId = WHOLESALE_CACHE.groupId;
  }
  if (values.taxExempt === true) {
    payload.taxExempt = true;
  }
  return payload;
}

async function getWholesaleStatus(customerId) {
  const targetGroupId = await resolveWholesaleGroupId().catch(() => null);
  const customer = await ecwidFetchJSON(`/customers/${encodeURIComponent(customerId)}`, { method: "GET" });

  const ids = Array.isArray(customer && customer.customerGroupIds)
    ? customer.customerGroupIds
    : (customer && typeof customer.customerGroupId !== "undefined")
      ? [customer.customerGroupId]
      : [];
  let isApproved = false;

  if (targetGroupId != null) {
    isApproved = ids.includes(targetGroupId);
  } else {
    const groupName = (customer && customer.customerGroup && customer.customerGroup.name) || "";
    isApproved = groupName.toLowerCase() === getWholesaleGroupName().toLowerCase();
  }

  return {
    isWholesaleApproved: !!isApproved,
    groupId: targetGroupId || null,
    groupName: getWholesaleGroupName()
  };
}

async function postWholesaleRegistration(values) {
  await Promise.all([
    ensureExtraFieldKeyByTitle("Cell Phone"),
    ensureExtraFieldKeyByTitle("Tax ID"),
    ensureExtraFieldKeyByTitle("Referral Source"),
    resolveWholesaleGroupId()
  ]);

  const payload = buildCustomerUpdatePayload(values);
  const json = await ecwidFetchJSON(`/customers/${encodeURIComponent(values.customerId)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  return json;
}

/*****************************************************************************/
// Wholesale Price Visibility
/*****************************************************************************/

function initializeWholesalePriceVisibility() {
  // Helper: inject CSS to hide prices, buy buttons, and price filter widget
  function injectWholesaleHidingCSS() {
    if (document.getElementById("wholesale-hide-css")) return;
    const style = document.createElement("style");
    style.id = "wholesale-hide-css";
    style.innerText = `
      /* Hide product prices, buy buttons, and price filter for guests */
      .details-product-purchase__controls, /* checkout and add to bag controls on product pages */
      .ec-filter--price, /* price filter widget on category pages */
      .ecwid-productBrowser-price,
      .ecwid-price-value,
      .ecwid-btn--add-to-cart,
      .ecwid-add-to-cart-button-container,
      .product-card-buy-icon,
      .ec-filter__item--price,
      .ec-price-filter,
      .ec-filter__item[data-filter="price"],
      .ec-filter__item--price-range,
      .ec-filter__item--price-slider,
      .ec-filter__item--price input,
      .ec-filter__item--price label,
      .ec-filter__item--price .ec-filter__item-content,
      .ec-filter__item--price .ec-filter__item-title {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Helper: remove injected CSS
  function removeWholesaleHidingCSS() {
    const style = document.getElementById("wholesale-hide-css");
    if (style) style.remove();
  }

  // Helper: set price/button visibility using ec.storefront.config
  function setWholesaleConfig(show) {
    if (isEcwidV3StorefrontLoaded) {
      window.ec = window.ec || {};
      window.ec.storefront = window.ec.storefront || {};
      const config = window.ec.storefront;
      config.product_list_price_behavior = show ? "SHOW" : "HIDE";
      config.product_list_buybutton_behavior = show ? "SHOW" : "HIDE";
      config.product_details_show_product_price = !!show;
      config.product_details_show_wholesale_prices = !!show;
      config.product_details_show_number_of_items_in_stock = !!show;
      config.product_details_show_buy_button = !!show;
      if (typeof Ecwid.refreshConfig === "function") {
        Ecwid.refreshConfig();
      }
    }
  }

  // Poll for Ecwid.Customer API readiness
  function pollForCustomerAPI(callback, maxAttempts = 30, interval = 200) {
    let attempts = 0;
    function tryGet() {
      if (Ecwid.Customer && typeof Ecwid.Customer.get === "function") {
        callback();
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(tryGet, interval);
      } else {
        console.warn(
          "Wholesale: Ecwid.Customer API not available after polling."
        );
      }
    }
    tryGet();
  }

  // Main logic: check login and set visibility
  function updateWholesaleVisibility() {
    Ecwid.Customer.get(function (customer) {
      const isLoggedIn = customer && customer.email;
      if (isLoggedIn) {
        setWholesaleConfig(true);
        removeWholesaleHidingCSS();
      } else {
        setWholesaleConfig(false);
        injectWholesaleHidingCSS();
      }
    });
  }

  // Initial run after API is ready
  pollForCustomerAPI(updateWholesaleVisibility);

  // Re-run on SPA navigation/page changes
  Ecwid.OnPageLoaded.add(function () {
    pollForCustomerAPI(updateWholesaleVisibility);
  });
}

try {
  window.triggerWholesaleVisibilityRefresh = function () {
    if (!window.Ecwid || !Ecwid.Customer || typeof Ecwid.Customer.get !== "function") return;
    Ecwid.Customer.get(function () {
      if (typeof Ecwid.refreshConfig === "function") Ecwid.refreshConfig();
    });
  };
} catch (e) {
  console.warn("Wholesale: Could not expose visibility refresh", e);
}

/*****************************************************************************/
// CATEGORY BANNER FUNCTIONALITY
/*****************************************************************************/

function initializeCategoryBanner() {
  // Inject CSS styles for category banner
  injectCategoryBannerStyles();

  // Listen for category page loads
  Ecwid.OnPageLoaded.add(function (page) {
    cleanupCategoryBanner();
    if (page.type !== "CATEGORY" || !page.categoryId) {
      // Ensure cleanup on non-category pages and skip banner creation
      return;
    }
    setTimeout(function () {
      fetchAndCreateCategoryBanner_Prod(page.categoryId);
    }, 400);

    // Additional check after a longer delay for slow loading
    setTimeout(function () {
      fetchAndCreateCategoryBanner_Prod(page.categoryId);
    }, 1800);
  });

  // Initial check in case DOM is ready before Ecwid SPA event
  setTimeout(function () {
    const page =
      window.Ecwid && Ecwid.getLastLoadedPage && Ecwid.getLastLoadedPage();
    if (page && page.type === "CATEGORY" && page.categoryId) {
      cleanupCategoryBanner(); // Ensure fresh state before initial render
      fetchAndCreateCategoryBanner_Prod(page.categoryId);
    }
  }, 800);
}

// Fetch category data from Ecwid API and create banner (production version)
async function fetchAndCreateCategoryBanner_Prod(categoryId) {
  const parentContainer = document.querySelector(".ecwid-productBrowser-head");
  if (!parentContainer) {
    console.warn(
      "Category Banner: Parent container not found; cannot render banner."
    );
    return;
  }

  // Prevent duplicate wrapper if already present
  if (parentContainer.querySelector(".category-banner")) {
    return;
  }

  // Find the description container and overlay
  const descContainer = document.querySelector(".grid__description");
  // Dynamically resolve storeId and public token; wait until Ecwid API is ready
  try {
    const { storeId, publicToken } = await waitForEcwidAndTokens();
    const apiUrl = `https://app.ecwid.com/api/v3/${storeId}/categories/${categoryId}`;
    const resp = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${publicToken}` },
    });
    const data = resp ? await resp.json() : null;
    if (!data || (!data.imageUrl && !data.originalImageUrl)) {
      console.warn(
        "Category Banner: No image found in API response for category",
        categoryId,
        data
      );
      return;
    }
    // Prefer imageUrl, fallback to originalImageUrl
    const imageUrl = data.imageUrl || data.originalImageUrl;
    if (!imageUrl) {
      console.warn(
        "Category Banner: No usable image URL in API response for category",
        categoryId
      );
      return;
    }
    // Ensure no leftover banner-container class before creation
    parentContainer.classList.remove("category-banner-container");
    // Create or update the banner (now using parentContainer as container, descContainer as overlay)
    createApiCategoryBanner(parentContainer, descContainer, imageUrl);
  } catch (err) {
    console.error(
      "Category Banner: Failed to resolve Ecwid tokens or fetch category data.",
      err
    );
  }
}

function cleanupCategoryBanner() {
  try {
    const parentContainer = document.querySelector(
      ".ecwid-productBrowser-head"
    );
    if (!parentContainer) {
      return;
    }

    // Remove banner container class if present
    parentContainer.classList.remove("category-banner-container");

    // Remove category banner children if present
    parentContainer
      .querySelectorAll(".category-banner")
      .forEach(function (wrapper) {
        wrapper.remove();
      });
  } catch (err) {
    console.warn("Category Banner: Cleanup error", err);
  }
}

// Build the banner using the fetched image and description overlay
function createApiCategoryBanner(container, overlay, imageUrl) {
  // Safety: require container only; overlay is optional
  if (!container) {
    console.warn(
      "Category Banner: Missing container; skipping banner creation."
    );
    return;
  }
  // Add banner container class
  container.classList.add("category-banner-container");

  // Remove any previous banner images
  const oldBannerImg = container.querySelector(".category-banner-img-from-api");
  if (oldBannerImg) oldBannerImg.remove();

  // Create the image element
  const img = document.createElement("img");
  img.src = imageUrl;
  img.alt = "Category Banner";
  img.className = "category-banner-img-from-api";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.style.objectPosition = "center";
  img.style.display = "block";

  // Create wrapper for image and overlay
  const wrapper = document.createElement("div");
  wrapper.classList.add("category-banner");

  // Insert image as first child of banner container
  wrapper.appendChild(img);
  if (overlay) {
    wrapper.appendChild(overlay);
  }
  container.insertBefore(wrapper, container.firstChild);

  // Add overlay classes (use minimal class for new CSS)
  if (overlay) {
    overlay.classList.add("category-banner-text");
    overlay.style = "";
  }

  // Force reflow
  setTimeout(function () {
    container.offsetHeight;
  }, 100);
}

function injectCategoryBannerStyles() {
  // Only load external app.css for category banner styles
  if (
    !document.querySelector(
      'link[href="https://keryxsolutions.github.io/lightspeed-wholesale/app.css"]'
    )
  ) {
    const localCssLink = document.createElement("link");
    localCssLink.rel = "stylesheet";
    localCssLink.href =
      "https://keryxsolutions.github.io/lightspeed-wholesale/app.css";
    localCssLink.onload = function () {};
    localCssLink.onerror = function () {
      console.warn("Category Banner: Failed to load external app.css");
    };
    document.head.appendChild(localCssLink);
  }

  // Load Google Fonts if not already present
  if (!document.querySelector('link[href*="Cormorant+Garamond"]')) {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
}

/*****************************************************************************/
// PRODUCT TAG SYSTEM FUNCTIONALITY
/*****************************************************************************/

function initializeProductTagSystem() {
  try {
    injectTagStyles();

    // SPA navigation: handle tags on every page load
    Ecwid.OnPageLoaded.add(handleTagSystemOnPage);

    // On initial load, handle tag page if needed
    const tagSlugInit = getTagSlugFromUrl();
    if (tagSlugInit) renderTagPage(tagSlugInit);

    // Tag system initialized
  } catch (err) {
    console.error("Tag System: Initialization failed.", err);
  }
}

/**
 * Utility: Slugify tag for URL
 */
function slugifyTag(tag) {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Utility: Unslugify for display
 */
function unslugifyTag(slug) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, function (l) {
    return l.toUpperCase();
  });
}

/**
 * Fetch product data using REST API with public token
 */
async function fetchProductData(productId, callback) {
  try {
    // Dynamically resolve storeId and public token; wait until Ecwid API is ready
    const { storeId, publicToken } = await waitForEcwidAndTokens();
    const apiUrl = `https://app.ecwid.com/api/v3/${storeId}/products/${productId}`;
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${publicToken}` },
    });
    const data = response ? await response.json() : null;
    if (data && !data.errorMessage) {
      callback(data);
    } else {
      console.warn("Tag System: Product data fetch failed", data);
    }
  } catch (err) {
    console.warn("Tag System: Product data fetch error", err);
  }
}

/**
 * Display tags on product detail pages
 */
function renderProductTags(product) {
  try {
    if (!product || !product.attributes) {
      console.warn("Tag System: No attributes found on product", product);
      return;
    }

    // Find TAGS attribute
    const tagsAttr = product.attributes.find(
      (attr) =>
        attr.type === "TAGS" ||
        attr.type === "tags" ||
        attr.name.toLowerCase() === "tags" ||
        attr.name.toLowerCase().includes("tag")
    );

    if (!tagsAttr) {
      console.warn(
        "Tag System: No tag attribute found in product attributes",
        product.attributes
      );
      return;
    }
    if (!tagsAttr.value || tagsAttr.value.length === 0) {
      console.warn(
        "Tag System: Tag attribute found but has no value",
        tagsAttr
      );
      return;
    }

    // Prevent duplicate injection
    if (document.querySelector(".product-details-module__tags")) return;

    // Handle both array and string values
    const tagValues = Array.isArray(tagsAttr.value)
      ? tagsAttr.value
      : [tagsAttr.value];

    const tagDiv = document.createElement("div");
    tagDiv.className = "product-details-module__tags";
    tagDiv.innerHTML = '<span class="product-tags-label">Tags:</span> ';

    tagValues.forEach(function (tag, idx) {
      if (tag && tag.trim()) {
        const slug = slugifyTag(tag.trim());
        const a = document.createElement("a");
        a.className = "product-tag-link";
        a.href = "#" + slug; // Use hash navigation for now
        a.textContent = tag.trim();
        a.onclick = function (e) {
          e.preventDefault();
          // For now, just show an alert - tag pages will be implemented separately
          alert("Tag page for '" + tag.trim() + "' - Coming soon!");
        };
        tagDiv.appendChild(a);
        if (idx < tagValues.length - 1) {
          tagDiv.appendChild(document.createTextNode(", "));
        }
      }
    });

    // Insert after .product-details-module__content
    const detailsContent = document.querySelector(
      ".product-details-module__content"
    );
    if (detailsContent) {
      detailsContent.parentNode.insertBefore(
        tagDiv,
        detailsContent.nextSibling
      );
    }

    console.log("Tag System: Tags rendered for product", product.id);
  } catch (err) {
    console.warn("Tag System: Failed to render product tags.", err);
  }
}

/**
 * Detect if current page is a tag page (placeholder for future implementation)
 */
function getTagSlugFromUrl() {
  const m = window.location.pathname.match(/^\/tag\/([a-z0-9\-]+)/i);
  return m ? m[1] : null;
}

/**
 * Render tag page (placeholder for future implementation)
 */
function renderTagPage(tagSlug) {
  try {
    console.log("Tag System: Tag page requested for:", tagSlug);
    // Tag pages require server-side implementation or different approach
    // For now, redirect to search
    const searchUrl = "/?search=" + encodeURIComponent(unslugifyTag(tagSlug));
    window.location.href = searchUrl;
  } catch (err) {
    console.error("Tag System: Failed to render tag page.", err);
  }
}

/**
 * Inject CSS for tag styling (once)
 */
function injectTagStyles() {
  // Ensure external app.css is loaded for tag styles (idempotent)
  if (
    !document.querySelector(
      'link[href="https://keryxsolutions.github.io/lightspeed-wholesale/app.css"]'
    )
  ) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://keryxsolutions.github.io/lightspeed-wholesale/app.css";
    document.head.appendChild(link);
  }
}

/**
 * Main tag system handler for SPA navigation
 */
function handleTagSystemOnPage(page) {
  try {
    // Product detail page: render tags
    if (page && page.type === "PRODUCT" && page.productId) {
      console.log("Tag System: Product page detected, ID:", page.productId);

      // Use REST API to fetch product data with attributes
      fetchProductData(page.productId, function (product) {
        setTimeout(function () {
          renderProductTags(product);
        }, 500); // Longer delay to ensure DOM is ready
      });
    }

    // Tag page: render tag products (placeholder)
    const tagSlug = getTagSlugFromUrl();
    if (tagSlug) {
      renderTagPage(tagSlug);
    }
  } catch (err) {
    console.error("Tag System: Error in page handler.", err);
  }
}

try {
  window.initializeProductTagSystem = initializeProductTagSystem;
  window.renderProductTags = renderProductTags;
  window.fetchProductData = fetchProductData;
} catch (e) {
  console.warn("Tag System: Could not export functions to window", e);
}

/*****************************************************************************/
// WHOLESALE REGISTRATION MODULE
/*****************************************************************************/

function initializeWholesaleRegistration() {
  if (!WHOLESALE_FLAGS.ENABLE_WHOLESALE_REGISTRATION) return;

  // Initial run
  try {
    const last = window.Ecwid && Ecwid.getLastLoadedPage && Ecwid.getLastLoadedPage();
    handleWholesaleRegistrationOnPage(last || { type: "UNKNOWN" });
  } catch (e) {
    handleWholesaleRegistrationOnPage({ type: "UNKNOWN" });
  }

  // SPA navigation
  Ecwid.OnPageLoaded.add(handleWholesaleRegistrationOnPage);

  // Hash-based routing support
  window.addEventListener("hashchange", function () {
    const page = window.Ecwid && Ecwid.getLastLoadedPage && Ecwid.getLastLoadedPage();
    handleWholesaleRegistrationOnPage(page || { type: "UNKNOWN" });
  });
}

// Session cache to reduce repeated status calls
const WHOLESALE_STATUS_CACHE = { customerId: null, isWholesaleApproved: null };

function fetchLoggedInCustomer() {
  return new Promise((resolve) => {
    if (!window.Ecwid || !Ecwid.Customer || typeof Ecwid.Customer.get !== "function") {
      resolve(null);
      return;
    }
    Ecwid.Customer.get((c) => resolve(c && c.email ? c : null));
  });
}

async function handleWholesaleRegistrationOnPage(page) {
  try {
    const onReg = isWholesaleRegistrationPath();
    const customer = await fetchLoggedInCustomer();

    // Cleanup when leaving registration route
    if (!onReg) {
      forceHidePricesOnRegistration(false);
      removeNodeById("wholesale-registration-root");
    }

    // Banner visibility (hidden on registration route)
    await renderWholesaleBanner({ customer, onReg });

    // Registration route: render shell and force-hide prices
    if (onReg) {
      renderWholesaleRegistrationPageShell(customer);
      forceHidePricesOnRegistration(true);
      return;
    }

    // Non-registration routes: redirect logged-in non-wholesale users
    if (customer && typeof getWholesaleStatus === "function") {
      // Use cache when available
      if (
        WHOLESALE_STATUS_CACHE.customerId === customer.id &&
        WHOLESALE_STATUS_CACHE.isWholesaleApproved != null
      ) {
        if (!WHOLESALE_STATUS_CACHE.isWholesaleApproved) {
          window.location.href = toWholesaleRegistrationPath();
        }
        return;
      }

      const status = await getWholesaleStatus(customer.id).catch(() => null);
      if (status && typeof status.isWholesaleApproved === "boolean") {
        WHOLESALE_STATUS_CACHE.customerId = customer.id;
        WHOLESALE_STATUS_CACHE.isWholesaleApproved = !!status.isWholesaleApproved;
        if (!status.isWholesaleApproved) {
          window.location.href = toWholesaleRegistrationPath();
          return;
        }
      }
    }
  } catch (e) {
    console.warn("Wholesale Reg: handler error", e);
  }
}

async function renderWholesaleBanner({ customer, onReg }) {
  if (!WHOLESALE_FLAGS.ENABLE_WHOLESALE_BANNER || onReg) {
    removeNodeById("wholesale-registration-banner");
    return;
  }

  // Show for guests; for logged-in users only if not wholesale-approved
  let shouldShow = !customer;
  if (customer && typeof getWholesaleStatus === "function") {
    if (
      WHOLESALE_STATUS_CACHE.customerId === customer.id &&
      WHOLESALE_STATUS_CACHE.isWholesaleApproved != null
    ) {
      shouldShow = !WHOLESALE_STATUS_CACHE.isWholesaleApproved;
    } else {
      const status = await getWholesaleStatus(customer.id).catch(() => null);
      if (status && typeof status.isWholesaleApproved === "boolean") {
        WHOLESALE_STATUS_CACHE.customerId = customer.id;
        WHOLESALE_STATUS_CACHE.isWholesaleApproved = !!status.isWholesaleApproved;
        shouldShow = !status.isWholesaleApproved;
      } else {
        // Fail-open on errors
        shouldShow = true;
      }
    }
  }

  const id = "wholesale-registration-banner";
  if (!shouldShow) {
    removeNodeById(id);
    return;
  }

  const container = document.querySelector(".ecwid-productBrowser") || document.body;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.className = "wholesale-registration-banner";
    // Minimal sticky inline styles (avoid app.css changes in M2)
    el.style.position = "sticky";
    el.style.top = "0";
    el.style.zIndex = "1000";
    el.style.background = "#0b5fff";
    el.style.color = "#fff";
    el.style.padding = "10px 12px";
    el.style.textAlign = "center";
    el.style.fontWeight = "600";
    container.prepend(el);
  }

  el.innerHTML =
    '<span>Register to access prices and place an order.</span> ' +
    `<a href="${toWholesaleRegistrationPath()}" style="color:#fff;text-decoration:underline;margin-left:8px;">Register</a>`;

  trackWholesaleEvent("wholesale_banner_shown", {});
  if (!el.dataset.telemetryClick) {
    const a = el.querySelector('a[href]');
    if (a) {
      a.addEventListener("click", function () { trackWholesaleEvent("wholesale_banner_click", {}); });
      el.dataset.telemetryClick = "1";
    }
  }
}

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

function renderWholesaleRegistrationPageShell(customer) {
  const container =
    document.querySelector(".ecwid-productBrowser") ||
    document.querySelector(".ec-page") ||
    document.body;

  let root = document.getElementById("wholesale-registration-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "wholesale-registration-root";
    root.style.background = "#fff";
    root.style.border = "1px solid #eee";
    root.style.borderRadius = "8px";
    root.style.padding = "16px";
    root.style.margin = "12px 0";
    container.prepend(root);
  }

  const email = (customer && customer.email) || "";
  const signedInBlock = email
    ? `<div style="margin-bottom:8px;color:#555;">Signed in as: <strong>${email}</strong></div>`
    : '<div style="margin-bottom:8px;color:#b00;">Please sign in to continue with wholesale registration.</div>';

  root.innerHTML = [
    '<h1 style="margin:0 0 8px;">Wholesale Registration</h1>',
    signedInBlock,
    '<div id="wr-error-summary" role="alert" aria-live="polite" style="display:none;margin-bottom:8px;color:#b00;"></div>',
    '<form id="wholesale-reg-form" novalidate>',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">',
        // Email (readonly)
        '<label style="grid-column:1/-1;display:block;">',
          '<span>Email (read-only)</span><br>',
          `<input id="wr-email" type="email" value="${email}" readonly disabled style="width:100%;padding:8px;">`,
        '</label>',

        // Name (required)
        '<label style="display:block;">',
          '<span>Name *</span><br>',
          '<input id="wr-name" type="text" style="width:100%;padding:8px;" aria-invalid="false">',
          '<div id="err-wr-name" class="wr-field-error" aria-live="polite" style="color:#b00;font-size:12px;"></div>',
        '</label>',

        // Company (required)
        '<label style="display:block;">',
          '<span>Company *</span><br>',
          '<input id="wr-company" type="text" style="width:100%;padding:8px;" aria-invalid="false">',
          '<div id="err-wr-company" class="wr-field-error" aria-live="polite" style="color:#b00;font-size:12px;"></div>',
        '</label>',

        // Country (required, ISO 2)
        '<label style="display:block;">',
          '<span>Country (ISO 2) *</span><br>',
          '<input id="wr-country" type="text" maxlength="2" style="width:100%;padding:8px;text-transform:uppercase;" aria-invalid="false" placeholder="US">',
          '<div id="err-wr-country" class="wr-field-error" aria-live="polite" style="color:#b00;font-size:12px;"></div>',
        '</label>',

        // Postal code (required)
        '<label style="display:block;">',
          '<span>Postal Code *</span><br>',
          '<input id="wr-postal" type="text" style="width:100%;padding:8px;" aria-invalid="false">',
          '<div id="err-wr-postal" class="wr-field-error" aria-live="polite" style="color:#b00;font-size:12px;"></div>',
        '</label>',

        // Phone (required)
        '<label style="display:block;">',
          '<span>Phone *</span><br>',
          '<input id="wr-phone" type="tel" style="width:100%;padding:8px;" aria-invalid="false" placeholder="+1 555-555-5555">',
          '<div id="err-wr-phone" class="wr-field-error" aria-live="polite" style="color:#b00;font-size:12px;"></div>',
        '</label>',

        // Cell phone (optional)
        '<label style="display:block;">',
          '<span>Cell Phone (optional)</span><br>',
          '<input id="wr-cell" type="tel" style="width:100%;padding:8px;" aria-invalid="false">',
          '<div id="err-wr-cell" class="wr-field-error" aria-live="polite" style="color:#b00;font-size:12px;"></div>',
        '</label>',

        // Tax ID (required)
        '<label style="display:block;">',
          '<span>Tax ID *</span><br>',
          '<input id="wr-taxid" type="text" style="width:100%;padding:8px;" aria-invalid="false">',
          '<div id="err-wr-taxid" class="wr-field-error" aria-live="polite" style="color:#b00;font-size:12px;"></div>',
        '</label>',

        // Referral (optional)
        '<label style="display:block;">',
          '<span>How did you hear about us? (optional)</span><br>',
          '<input id="wr-referral" type="text" style="width:100%;padding:8px;" aria-invalid="false" placeholder="Search Engine, Friend, ...">',
          '<div id="err-wr-referral" class="wr-field-error" aria-live="polite" style="color:#b00;font-size:12px;"></div>',
        '</label>',

        // Marketing consent (checkbox)
        '<label style="grid-column:1/-1;display:flex;align-items:center;gap:8px;">',
          '<input id="wr-marketing" type="checkbox">',
          '<span>Sign me up for the newsletter</span>',
        '</label>',
      '</div>',

      '<div style="margin-top:12px;display:flex;gap:8px;align-items:center;">',
        '<button id="wr-submit" type="submit" style="padding:10px 14px;background:#0b5fff;color:#fff;border:none;border-radius:4px;font-weight:600;cursor:pointer;">Submit Registration</button>',
        '<span id="wr-status" style="color:#555;"></span>',
      '</div>',
    '</form>'
  ].join("");

  if (!root.dataset.telemetryView) { trackWholesaleEvent("wholesale_registration_view", {}); root.dataset.telemetryView = "1"; }

  attachWholesaleRegistrationHandlers(root, customer);
}

function validateWholesaleRegistrationValues(values) {
  const errors = {};
  function req(v) { return !!(v && String(v).trim()); }
  const phoneRe = /^[+0-9()\-\s]{7,}$/;
  const iso2 = /^[A-Za-z]{2}$/;

  if (!req(values.name)) errors.name = "Name is required";
  if (!req(values.companyName)) errors.companyName = "Company is required";
  if (!req(values.countryCode) || !iso2.test(values.countryCode)) errors.countryCode = "Country must be a 2-letter code";
  if (!req(values.postalCode)) errors.postalCode = "Postal code is required";
  if (!req(values.phone) || !phoneRe.test(values.phone)) errors.phone = "Enter a valid phone number";
  if (!req(values.taxId)) errors.taxId = "Tax ID is required";
  return errors;
}

function updateWholesaleSubmitState({ submitting, statusText }) {
  const btn = document.getElementById("wr-submit");
  const status = document.getElementById("wr-status");
  if (btn) btn.disabled = !!submitting;
  if (btn) btn.textContent = submitting ? "Submitting…" : "Submit Registration";
  if (status) status.textContent = statusText || "";
}

function showFieldError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message || "";
  const inputMap = {
    "err-wr-name": "wr-name",
    "err-wr-company": "wr-company",
    "err-wr-country": "wr-country",
    "err-wr-postal": "wr-postal",
    "err-wr-phone": "wr-phone",
    "err-wr-taxid": "wr-taxid",
  };
  const inputId = inputMap[id];
  if (inputId) {
    const input = document.getElementById(inputId);
    if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
  }
}

function clearFieldErrors() {
  [
    "err-wr-name",
    "err-wr-company",
    "err-wr-country",
    "err-wr-postal",
    "err-wr-phone",
    "err-wr-taxid",
    "err-wr-referral",
    "err-wr-cell",
  ].forEach((id) => showFieldError(id, ""));
  const errSummary = document.getElementById("wr-error-summary");
  if (errSummary) { errSummary.textContent = ""; errSummary.style.display = "none"; }
}

function attachWholesaleRegistrationHandlers(root, customer) {
  const form = root && root.querySelector && root.querySelector("#wholesale-reg-form");
  if (!form) return;

  // Live validation to toggle button state
  const requiredIds = ["wr-name","wr-company","wr-country","wr-postal","wr-phone","wr-taxid"];
  function computeValues() {
    return {
      email: (customer && customer.email) || "",
      name: document.getElementById("wr-name").value.trim(),
      companyName: document.getElementById("wr-company").value.trim(),
      countryCode: document.getElementById("wr-country").value.trim().toUpperCase(),
      postalCode: document.getElementById("wr-postal").value.trim(),
      phone: document.getElementById("wr-phone").value.trim(),
      cellPhone: document.getElementById("wr-cell").value.trim(),
      taxId: document.getElementById("wr-taxid").value.trim(),
      referralSource: document.getElementById("wr-referral").value.trim(),
      acceptMarketing: !!document.getElementById("wr-marketing").checked,
      customerId: customer && customer.id,
    };
  }

  function refreshSubmitEnabled() {
    const v = computeValues();
    const errs = validateWholesaleRegistrationValues(v);
    const btn = document.getElementById("wr-submit");
    if (btn) btn.disabled = Object.keys(errs).length > 0 || !v.customerId;
  }

  requiredIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", refreshSubmitEnabled);
  });

  refreshSubmitEnabled();

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearFieldErrors();

    const values = computeValues();
    const errs = validateWholesaleRegistrationValues(values);
    if (Object.keys(errs).length > 0) {
      // Show inline errors and summary
      if (errs.name) showFieldError("err-wr-name", errs.name);
      if (errs.companyName) showFieldError("err-wr-company", errs.companyName);
      if (errs.countryCode) showFieldError("err-wr-country", errs.countryCode);
      if (errs.postalCode) showFieldError("err-wr-postal", errs.postalCode);
      if (errs.phone) showFieldError("err-wr-phone", errs.phone);
      if (errs.taxId) showFieldError("err-wr-taxid", errs.taxId);
      const errSummary = document.getElementById("wr-error-summary");
      if (errSummary) { errSummary.textContent = "Please correct the highlighted fields."; errSummary.style.display = "block"; }
      return;
    }

    if (!values.customerId) {
      const errSummary = document.getElementById("wr-error-summary");
      if (errSummary) { errSummary.textContent = "Please sign in before submitting the registration."; errSummary.style.display = "block"; }
      return;
    }

    try {
      updateWholesaleSubmitState({ submitting: true, statusText: "Submitting registration…" });
      trackWholesaleEvent("wholesale_registration_submit", { acceptMarketing: !!values.acceptMarketing });
      // Submit to backend contract
      await postWholesaleRegistration({
        customerId: values.customerId,
        email: values.email,
        name: values.name,
        companyName: values.companyName,
        countryCode: values.countryCode,
        postalCode: values.postalCode,
        phone: values.phone,
        cellPhone: values.cellPhone,
        taxId: values.taxId,
        referralSource: values.referralSource,
        acceptMarketing: values.acceptMarketing,
      });

      // Confirm approval then refresh/redirect
      let approved = false;
      try {
        const status = await getWholesaleStatus(values.customerId);
        approved = !!(status && status.isWholesaleApproved);
      } catch (_) {}

      if (approved) {
        try { if (typeof window.triggerWholesaleVisibilityRefresh === "function") window.triggerWholesaleVisibilityRefresh(); } catch (_) {}
        updateWholesaleSubmitState({ submitting: false, statusText: "Success. Redirecting…" });
        trackWholesaleEvent("wholesale_registration_success", {});
        setTimeout(function () { window.location.href = "/products"; }, 400);
      } else {
        updateWholesaleSubmitState({ submitting: false, statusText: "Registration submitted. Awaiting approval." });
      }
    } catch (err) {
      console.warn("Wholesale Reg: submission failed", err);
      trackWholesaleEvent("wholesale_registration_failure", {});
      updateWholesaleSubmitState({ submitting: false, statusText: "" });
      const errSummary = document.getElementById("wr-error-summary");
      if (errSummary) { errSummary.textContent = "Submission failed. Please try again."; errSummary.style.display = "block"; }
    }
  });
}
