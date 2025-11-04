/* Lightspeed eCom Custom App JS - Wholesale Portal */

/* This script assumes that product prices are turned OFF by default in the store's design settings. */
/* Added category banner functionality for full-width banners with text overlay. */

// App client ID (from your Ecwid app). Uses a single constant per docs.
const clientId = "custom-app-121843055-1";

// Config and flags
const WHOLESALE_FLAGS = {
  ENABLE_WHOLESALE_REGISTRATION: true,
  ENABLE_WHOLESALE_BANNER: true,
};

// Route helpers (supports pathname and hash)
function isAccountRegisterPath() {
  const p = window.location.pathname || "";
  const h = window.location.hash || "";
  return p === "/products/account/register" || /#\/?account\/register/.test(h);
}
function toAccountRegisterPath() {
  return "/products/account/register";
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
    const route = {
      path: window.location.pathname || "",
      hash: window.location.hash || "",
    };
    const key = name + "|" + JSON.stringify({ ...p, route });
    if (WHOLESALE_TELEMETRY.sent.has(key)) return;
    WHOLESALE_TELEMETRY.sent.add(key);
    if (WHOLESALE_TELEMETRY.sent.size > WHOLESALE_TELEMETRY.max) {
      WHOLESALE_TELEMETRY.sent.clear();
    }
    console.log("[WholesaleTelemetry]", name, p);
  } catch (_) {}
}
try {
  window.trackWholesaleEvent = trackWholesaleEvent;
} catch (_) {}

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
  return (
    (window.WHOLESALE_GROUP_NAME && String(window.WHOLESALE_GROUP_NAME)) ||
    "Wholesaler"
  );
}
const WHOLESALE_CACHE = {};

async function ecwidFetchJSON(path, options) {
  const { storeId, publicToken } = await waitForEcwidAndTokens();
  const url = `https://app.ecwid.com/api/v3/${storeId}${path}`;
  const init = options || {};
  const headers = Object.assign(
    {
      Authorization: `Bearer ${publicToken}`,
      "Content-Type": "application/json",
    },
    init.headers || {}
  );
  const res = await fetch(url, Object.assign({}, init, { headers }));
  if (!res.ok) {
    const err = new Error(`Ecwid API error ${res.status} for ${path}`);
    try {
      err.status = res.status;
    } catch (_) {}
    throw err;
  }
  return res.json();
}

/* removed legacy server proxy helpers */

/* removed legacy Admin REST registration helpers */

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
    if (
      !window.Ecwid ||
      !Ecwid.Customer ||
      typeof Ecwid.Customer.get !== "function"
    )
      return;
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
    const last =
      window.Ecwid && Ecwid.getLastLoadedPage && Ecwid.getLastLoadedPage();
    handleWholesaleRegistrationOnPage(last || { type: "UNKNOWN" });
  } catch (e) {
    handleWholesaleRegistrationOnPage({ type: "UNKNOWN" });
  }

  // SPA navigation
  Ecwid.OnPageLoaded.add(handleWholesaleRegistrationOnPage);

  // Hash-based routing support
  window.addEventListener("hashchange", function () {
    const page =
      window.Ecwid && Ecwid.getLastLoadedPage && Ecwid.getLastLoadedPage();
    handleWholesaleRegistrationOnPage(page || { type: "UNKNOWN" });
  });
}

// Session cache to reduce repeated status calls
const WHOLESALE_STATUS_CACHE = { customerId: null, isWholesaleApproved: null };

function fetchLoggedInCustomer() {
  return new Promise((resolve) => {
    if (
      !window.Ecwid ||
      !Ecwid.Customer ||
      typeof Ecwid.Customer.get !== "function"
    ) {
      resolve(null);
      return;
    }
    Ecwid.Customer.get((c) => resolve(c && c.email ? c : null));
  });
}

function isWholesaleByMembership(customer) {
  try {
    if (!customer || !customer.membership) return null;
    const name = (customer.membership && customer.membership.name) || "";
    if (!name) return null;
    return name.toLowerCase() === getWholesaleGroupName().toLowerCase();
  } catch (_) {
    return null;
  }
}

async function handleWholesaleRegistrationOnPage(page) {
  try {
    const onReg = isAccountRegisterPath();
    const customer = await fetchLoggedInCustomer();

    // Cleanup when leaving account/register
    if (!onReg) {
      stopAccountRegisterObserver();
      const c = queryAccountBody();
      if (c) restoreAccountBody(c);
      removeNodeById("account-register-root");
    }

    // Banner visibility (hidden on account/register)
    await renderWholesaleBanner({ customer, onReg });

    // On account/register, inject our form
    if (onReg) {
      const ensure = () => {
        if (queryAccountBody()) renderOrUpdateAccountRegister();
      };
      ensure();
      startAccountRegisterObserver(ensure);
    }
  } catch (e) {
    console.warn("Wholesale Reg: handler error", e);
  }
}

async function renderWholesaleBanner({ customer, onReg }) {
  const id = "wholesale-registration-banner";

  if (!WHOLESALE_FLAGS.ENABLE_WHOLESALE_BANNER || onReg) {
    removeNodeById(id);
    return;
  }

  // Show only for logged-in non-wholesale users
  let shouldShow = false;
  if (customer) {
    const membershipApproved = isWholesaleByMembership(customer);
    if (membershipApproved === true) shouldShow = false;
    else if (membershipApproved === false) shouldShow = true;
    else {
      shouldShow =
        WHOLESALE_STATUS_CACHE.customerId === customer.id
          ? !WHOLESALE_STATUS_CACHE.isWholesaleApproved
          : true;
    }
  } else {
    shouldShow = false;
  }

  if (!shouldShow) {
    removeNodeById(id);
    return;
  }

  const container = document.querySelector(".ins-tiles--main") || document.body;
  const anchor = document.querySelector(".ins-tile--header");
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
  }

  // Ensure placement: right after .ins-tile--header when present
  if (anchor && anchor.parentNode) {
    anchor.insertAdjacentElement("afterend", el);
  } else if (!el.parentNode) {
    // Fallback placement at top of container
    container.prepend(el);
  }

  el.innerHTML =
    "<span>Register to access prices and place an order.</span> " +
    `<a href="${toAccountRegisterPath()}" style="color:#fff;text-decoration:underline;margin-left:8px;">Register</a>`;

  trackWholesaleEvent("wholesale_banner_shown", {});
  if (!el.dataset.telemetryClick) {
    const a = el.querySelector("a[href]");
    if (a) {
      a.addEventListener("click", function () {
        trackWholesaleEvent("wholesale_banner_click", {});
      });
      el.dataset.telemetryClick = "1";
    }
  }
}

// Account/register DOM helpers and registration form rendering
function queryAccountBody() {
  return document.querySelector(".ec-cart__body-inner");
}
function hijackAccountBody(container) {
  if (!container || container.dataset.wrHijacked === "1")
    return document.getElementById("account-register-root");
  Array.from(container.children).forEach((child) => {
    if (child.id !== "account-register-root") {
      child.setAttribute("data-wr-hidden", "1");
      child.style.display = "none";
    }
  });
  let root = document.getElementById("account-register-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "account-register-root";
    container.prepend(root);
  }
  container.dataset.wrHijacked = "1";
  return root;
}
function restoreAccountBody(container) {
  if (!container) return;
  Array.from(container.children).forEach((child) => {
    if (child.id === "account-register-root") return;
    if (child.getAttribute("data-wr-hidden") === "1") {
      child.style.display = "";
      child.removeAttribute("data-wr-hidden");
    }
  });
  const root = document.getElementById("account-register-root");
  if (root) root.remove();
  delete container.dataset.wrHijacked;
}
let ACCOUNT_REGISTER_OBSERVER = null;
function startAccountRegisterObserver(onChange) {
  if (ACCOUNT_REGISTER_OBSERVER) return;
  const container = queryAccountBody();
  if (!container) return;
  ACCOUNT_REGISTER_OBSERVER = new MutationObserver(() => onChange());
  ACCOUNT_REGISTER_OBSERVER.observe(container, { childList: true });
}
function stopAccountRegisterObserver() {
  if (ACCOUNT_REGISTER_OBSERVER) {
    ACCOUNT_REGISTER_OBSERVER.disconnect();
    ACCOUNT_REGISTER_OBSERVER = null;
  }
}

let EXTRA_FIELD_DEFS_CACHE = null;
function getCheckoutExtraFieldDefsFromEc() {
  try {
    const defs = window.ec?.order?.extraFields || window.ec?.checkout?.extraFields || null;
    return defs && typeof defs === "object" ? defs : null;
  } catch { return null; }
}
async function postStorefrontCustomerUpdate(body) {
  const { storeId } = await waitForEcwidAndTokens();
  const url = `https://app.ecwid.com/storefront/api/v1/${storeId}/customer/update`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body || { lang: "en" })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `customer/update ${res.status}`);
  return data;
}
function normalizeExtraDefs(map) {
  const norm = (o) => !o ? null : ({
    key: o.key || null,
    title: o.title || "",
    placeholder: o.textPlaceholder || "",
    type: o.type || "text",
    required: !!o.required,
    options: Array.isArray(o.options) ? o.options.map(x => x.title) : null
  });
  const byTitle = (t) => {
    const low = t.toLowerCase();
    for (const k in map) if ((map[k]?.title || "").toLowerCase() === low) return map[k];
    return null;
  };
  const tax = norm(map["3w9kla3"] || byTitle("Tax ID"));
  const hear = norm(map["bp4q9w3"] || byTitle("How did you hear about us?"));
  const cell = norm(byTitle("Cell Phone"));
  return { tax, hear, cell };
}
async function loadCheckoutExtraFieldDefsSafe() {
  if (EXTRA_FIELD_DEFS_CACHE) return EXTRA_FIELD_DEFS_CACHE;
  const ecDefs = getCheckoutExtraFieldDefsFromEc();
  if (ecDefs) {
    EXTRA_FIELD_DEFS_CACHE = normalizeExtraDefs(ecDefs);
    return EXTRA_FIELD_DEFS_CACHE;
  }
  try {
    const resp = await postStorefrontCustomerUpdate({ lang: "en" });
    const defs = resp?.checkoutSettings?.extraFields || {};
    EXTRA_FIELD_DEFS_CACHE = normalizeExtraDefs(defs);
  } catch {
    EXTRA_FIELD_DEFS_CACHE = {
      tax: { key: null, title: "Tax ID", placeholder: "Enter your tax identification number", type: "text", required: true },
      hear: { key: null, title: "How did you hear about us?", placeholder: "", type: "select", options: ["Google","Wholesale Central","Referral","Retailing Insight","Other"] },
      cell: { key: null, title: "Cell Phone", placeholder: "", type: "text", required: false }
    };
  }
  return EXTRA_FIELD_DEFS_CACHE;
}

function formRow(inner) { return `<div class="ec-form__row"><div class="ec-form__cell">${inner}</div></div>`; }
function textInput({ id, label, value="", placeholder="", required=false, type="text", autocomplete="" }) {
  const req = required ? '<div class="marker-required marker-required--medium"></div>' : '';
  return `
    <label for="${id}"><div class="ec-form__title ec-header-h6">${req}${label}</div></label>
    <div class="form-control form-control--flexible">
      <input id="${id}" class="form-control__text" type="${type}" maxlength="255" value="${value}"
        ${autocomplete ? `autocomplete="${autocomplete}"` : ""} ${required ? "required" : ""}/>
      <div class="form-control__placeholder"><div class="form-control__placeholder-inner">${placeholder || ""}</div></div>
    </div>`;
}
function selectInput({ id, label, value="", options=[], required=false }) {
  const req = required ? '<div class="marker-required marker-required--medium"></div>' : '';
  const opts = options.map(o => `<option ${o===value?"selected":""}>${o}</option>`).join("");
  return `
    <label for="${id}"><div class="ec-form__title ec-header-h6">${req}${label}</div></label>
    <div class="form-control form-control--flexible"><select id="${id}" class="form-control__text">${opts}</select></div>`;
}

async function renderOrUpdateAccountRegister() {
  const container = queryAccountBody();
  if (!container) return;
  const root = hijackAccountBody(container);
  if (!root) return;
  const customer = await fetchLoggedInCustomer();
  const defs = await loadCheckoutExtraFieldDefsSafe();
  const model = {
    email: customer?.email || "",
    name: customer?.billingPerson?.name || customer?.name || "",
    phone: customer?.billingPerson?.phone || "",
    companyName: customer?.billingPerson?.companyName || "",
    postalCode: customer?.billingPerson?.postalCode || ""
  };
  root.innerHTML = `
    <div>
      <p><span class="ec-cart-step__mandatory-fields-notice">All fields are required unless they’re explicitly marked as optional.</span></p>
      <form id="wr-acc-form" class="ec-form" action onsubmit="return false">
        ${formRow(textInput({ id:"wr-email-ro", label:"Email", value:model.email, type:"email" }))}
        ${formRow(`
          <div class="ec-form__cell ec-form__cell--8 ec-form__cell-name">
            ${textInput({ id:"wr-name", label:"First and last name", value:model.name, required:true, autocomplete:"shipping name" })}
          </div>
          <div class="ec-form__cell ec-form__cell--4 ec-form__cell--phone">
            ${textInput({ id:"wr-phone", label:"Phone", value:model.phone, required:true, autocomplete:"shipping tel", type:"tel" })}
          </div>
        `)}
        ${formRow(textInput({ id:"wr-company", label:"Company name", value:model.companyName, required:true, autocomplete:"shipping organization" }))}
        ${formRow(textInput({ id:"wr-zip", label:"ZIP / Postal code", value:model.postalCode, required:true, autocomplete:"shipping postal-code" }))}
        ${defs?.tax ? formRow(textInput({ id:"wr-tax", label:defs.tax.title || "Tax ID", required:!!defs.tax.required, placeholder:defs.tax.placeholder })) : ""}
        ${defs?.cell ? formRow(textInput({ id:"wr-cell", label:defs.cell.title || "Cell Phone", placeholder:defs.cell.placeholder, type:"tel" })) : ""}
        ${defs?.hear ? formRow((defs.hear.type==="select" && defs.hear.options?.length)
          ? selectInput({ id:"wr-hear", label:defs.hear.title || "How did you hear about us?", options:defs.hear.options })
          : textInput({ id:"wr-hear", label:defs.hear.title || "How did you hear about us?", placeholder:defs.hear.placeholder })
        ) : ""}
        <div class="ec-form__row ec-form__row--continue">
          <div class="ec-form__cell ec-form__cell--6">
            <div class="form-control form-control--button form-control--large form-control--primary form-control--flexible form-control--done">
              <button id="wr-acc-submit" class="form-control__button" type="button">
                <div class="form-control__loader"></div>
                <span class="form-control__button-text">Continue</span>
              </button>
            </div>
          </div>
        </div>
        <div id="wr-acc-msg" class="form__msg" style="margin-top:8px;"></div>
      </form>
    </div>`;
  attachAccountRegisterHandlers(root, defs);
}

function buildStorefrontUpdatePayload(values, defs) {
  const updatedCustomer = {
    name: values.name,
    billingPerson: {
      name: values.name || "",
      companyName: values.companyName || "",
      postalCode: values.postalCode || "",
      phone: values.phone || ""
    }
  };
  const extraFields = {};
  const mapToUpdate = {};
  const push = (def, val) => {
    if (!def || !val) return;
    const key = def.key || def.title;
    mapToUpdate[key] = {
      title: def.title, type: def.type || "text",
      available: true, required: !!def.required, cpField: true
    };
    extraFields[key] = { title: def.title, value: val };
  };
  push(defs.tax, values.taxId);
  push(defs.cell, values.cellPhone);
  push(defs.hear, values.hear);

  return {
    updatedCustomer,
    checkout: {
      extraFields,
      removedExtraFieldsKeys: [],
      extraFieldsPayload: { mapToUpdate, keysToRemove: [], updateMode: "UPDATE_HIDDEN" }
    },
    lang: "en"
  };
}

function attachAccountRegisterHandlers(root, defs) {
  const getVals = () => ({
    name: document.getElementById("wr-name")?.value.trim() || "",
    phone: document.getElementById("wr-phone")?.value.trim() || "",
    companyName: document.getElementById("wr-company")?.value.trim() || "",
    postalCode: document.getElementById("wr-zip")?.value.trim() || "",
    taxId: document.getElementById("wr-tax")?.value.trim() || "",
    cellPhone: document.getElementById("wr-cell")?.value.trim() || "",
    hear: document.getElementById("wr-hear")?.value || ""
  });
  const btn = root.querySelector("#wr-acc-submit");
  const msg = root.querySelector("#wr-acc-msg");
  btn?.addEventListener("click", async () => {
    const v = getVals();
    if (!v.name || !v.phone || !v.companyName || !v.postalCode || (defs.tax?.required && !v.taxId)) {
      msg.textContent = "Please complete the required fields.";
      return;
    }
    btn.disabled = true;
    msg.textContent = "Saving…";
    try {
      const body = buildStorefrontUpdatePayload(v, defs);
      await postStorefrontCustomerUpdate(body);
      msg.textContent = "Saved.";
      if (typeof Ecwid.refreshConfig === "function") Ecwid.refreshConfig();
    } catch {
      msg.textContent = "Save failed. Please try again.";
    } finally {
      btn.disabled = false;
    }
  });
}
