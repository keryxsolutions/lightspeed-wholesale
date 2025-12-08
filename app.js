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

// External Registration Server base URL (override via window.WHOLESALE_REG_SERVER_URL if needed)
const REG_SERVER_URL =
  window.WHOLESALE_REG_SERVER_URL ||
  "https://ecwid-registration.keryx-solutions.workers.dev";

// Route helpers (supports pathname and hash)
function isAccountRegisterPath() {
  const p = window.location.pathname || "";
  const h = window.location.hash || "";
  return p === "/products/account/register" || /#\/?account\/register/.test(h);
}
function toAccountRegisterPath() {
  return "/products/account/register";
}

// DOM helper
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

// Banner persistence utilities (Version 2.2)
const REG_BANNER_KEY = "wr-banner";

function setRegistrationBanner(type, msg, durationMs = 5000) {
  try {
    const expiresAt = Date.now() + durationMs;
    sessionStorage.setItem(
      REG_BANNER_KEY,
      JSON.stringify({ type, message: msg, expiresAt })
    );
  } catch (_) {}
}

function restoreRegistrationBanner() {
  try {
    const raw = sessionStorage.getItem(REG_BANNER_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Date.now() > data.expiresAt) {
      sessionStorage.removeItem(REG_BANNER_KEY);
      return;
    }
    renderTopBanner(data.type, data.message);
  } catch (_) {}
}

function renderTopBanner(type, msg) {
  const id = "wholesale-registration-transient-banner";
  removeNodeById(id);
  const bg = type === "success" ? "#4caf50" : "#d32f2f";
  const banner = document.createElement("div");
  banner.id = id;
  banner.textContent = msg;
  Object.assign(banner.style, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    zIndex: "10000",
    background: bg,
    color: "#fff",
    padding: "1rem",
    textAlign: "center",
    fontSize: "1rem",
  });
  document.body.appendChild(banner);
  // Auto-dismiss after 5 seconds
  setTimeout(() => removeNodeById(id), 5000);
}

// Auto-redirect utility for logged-in non-wholesale users (Version 2.2)
function maybeRedirectToRegistration(isLoggedIn, isWholesale) {
  try {
    // Skip if not logged in or already wholesale
    if (!isLoggedIn || isWholesale) return;

    // Skip if already on registration page
    if (isAccountRegisterPath()) return;

    // Skip if already redirected this session
    if (sessionStorage.getItem("wr-autoredirect") === "1") return;

    // Redirect to registration page
    sessionStorage.setItem("wr-autoredirect", "1");
    console.log("Wholesale: Auto-redirecting non-wholesale user to registration");
    window.location.href = toAccountRegisterPath();
  } catch (_) {
    // Ignore errors (sessionStorage, navigation failures)
  }
}

Ecwid.OnAPILoaded.add(function () {
  // Restore banner on page load (if exists and not expired)
  restoreRegistrationBanner();

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

/**
 * Get storefront session token for authenticated API calls to external services
 * @returns {Promise<string>} Session token
 * @throws {Error} If session token is unavailable
 */
async function getStorefrontSessionToken() {
  // Preferred: documented API if available
  if (Ecwid?.Storefront?.getSessionToken) {
    try {
      return await Ecwid.Storefront.getSessionToken();
    } catch (_) {}
  }
  // Fallback: internal path observed in platform widgets
  try {
    const v =
      Ecwid?.ecommerceInstance?.widgets?.options?.storefrontApiClient
        ?.sessionStorageOptions?.sessionToken?._value;
    if (v) return v;
  } catch (_) {}
  throw new Error("Session token unavailable");
}

/*****************************************************************************/

function getWholesaleGroupName() {
  return (
    (window.WHOLESALE_GROUP_NAME && String(window.WHOLESALE_GROUP_NAME)) ||
    "Wholesaler"
  );
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
    if (window.ec && window.ec.storefront) {
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

  // Helper: hide cart links and account steps for non-wholesale users (Version 2.2)
  function applyNonWholesaleUIHides(isWholesale, isLoggedIn) {
    try {
      // If wholesale or guest, restore any previously hidden elements
      if (isWholesale || !isLoggedIn) {
        // Restore cart links
        document.querySelectorAll('a[data-wr-hidden-cart-link="1"]').forEach((el) => {
          el.style.display = "";
          el.removeAttribute("data-wr-hidden-cart-link");
        });
        // Restore account steps
        document.querySelectorAll('[data-wr-hidden-account-step="1"]').forEach((el) => {
          el.style.display = "";
          el.removeAttribute("data-wr-hidden-account-step");
        });
        return;
      }

      // Hide cart links for logged-in non-wholesale users
      document.querySelectorAll('a[href*="/products/cart"]').forEach((el) => {
        if (el.getAttribute("data-wr-hidden-cart-link") !== "1") {
          el.style.display = "none";
          el.setAttribute("data-wr-hidden-cart-link", "1");
        }
      });

      // Hide account bag and favorites steps
      const accountSteps = [".ec-cart-step--bag", ".ec-cart-step--favorites"];
      accountSteps.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          if (el.getAttribute("data-wr-hidden-account-step") !== "1") {
            el.style.display = "none";
            el.setAttribute("data-wr-hidden-account-step", "1");
          }
        });
      });
    } catch (err) {
      console.warn("Wholesale: Error applying non-wholesale UI hides", err);
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

  // Main logic: check login and wholesale membership for visibility
  function updateWholesaleVisibility() {
    Ecwid.Customer.get(function (customer) {
      const isLoggedIn = customer && customer.email;
      let showPrices = false;

      if (isLoggedIn) {
        // Check if customer is in Wholesaler group
        const wholesaleName = getWholesaleGroupName().toLowerCase();
        const memberName = (customer.membership?.name || "").toLowerCase();
        showPrices = memberName === wholesaleName;
      }

      // Auto-redirect non-wholesale users to registration (once per session)
      maybeRedirectToRegistration(isLoggedIn, showPrices);

      // Apply additional UI hiding for non-wholesale users
      applyNonWholesaleUIHides(showPrices, isLoggedIn);

      if (showPrices) {
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
    restoreRegistrationBanner(); // Restore banner on SPA navigation
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

  // Note: Banner persistence now handled by restoreRegistrationBanner() in OnAPILoaded

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
      // Membership status unknown - default to showing banner
      shouldShow = true;
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
let RENDERING_ACC_FORM = false;

function startAccountRegisterObserver(onChange) {
  if (ACCOUNT_REGISTER_OBSERVER) return;
  const container = queryAccountBody();
  if (!container) return;

  // Debounce callback to prevent rapid re-renders from self-triggered mutations
  let timeoutId = null;
  const debouncedOnChange = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(onChange, 80);
  };

  ACCOUNT_REGISTER_OBSERVER = new MutationObserver(debouncedOnChange);
  ACCOUNT_REGISTER_OBSERVER.observe(container, {
    childList: true,
    subtree: false,
  });
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
    const defs =
      window.ec?.order?.extraFields || window.ec?.checkout?.extraFields || null;
    return defs && typeof defs === "object" ? defs : null;
  } catch {
    return null;
  }
}
/**
 * Access App Storage JSON safely. Supports both Ecwid.getAppStorageData(scope, key) and Ecwid.getAppStorageData(scope).
 */
function getAppStorageJSON(key) {
  try {
    if (typeof Ecwid?.getAppPublicConfig === "function") {
      const raw = Ecwid.getAppPublicConfig(clientId);
      if (!raw) {
        console.info("Wholesale Reg: App Storage empty");
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed?.[key]) {
        console.info("Wholesale Reg: App Storage empty for key: ", key);
        return null;
      }
      return parsed?.[key];
    }
  } catch (e) {
    console.warn("Wholesale Reg: App Storage parse error", e);
  }
  return null;
}
function validateAppPublicConfig() {
  try {
    if (typeof Ecwid?.getAppPublicConfig === "function") {
      const raw = Ecwid.getAppPublicConfig(clientId);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.version !== 2) {
        console.warn("Wholesale Reg: App public config version is not 2");
      }
      if (!Array.isArray(parsed?.extraFields)) {
        console.warn("Wholesale Reg: App public config extraFields is not an array");
      }
    }
  } catch (_) {}
}
/**
 * Load Customer Extra Field definitions from App Storage public/extrafields.
 * Returns { tax, hear, cell } or nulls if not found.
 */
function loadCustomerExtraFieldDefsFromStorage() {
  try {
    validateAppPublicConfig();
    const data = getAppStorageJSON("extraFields");
    if (!data) return null;
    const items = Array.isArray(data) ? data : [];
    // Config v2 is curated upstream; no entityTypes filtering needed
    const customers = items;
    const byTitle = {};
    for (const it of customers) {
      const title = String(it.title || "").trim();
      if (!title) continue;
      const low = title.toLowerCase();
      byTitle[low] = {
        key: it.key || null,
        title,
        placeholder: it.placeholder || "",
        type: String(it.type || "text").toLowerCase(),
        required: !!it.required,
        options: Array.isArray(it.options)
          ? it.options.map((o) => ({ title: o.title }))
          : null
      };
    }
    const tax = byTitle["tax id"] || null;
    const hear = byTitle["how did you hear about us?"] || null;
    const cell =
      byTitle["cell phone"] ||
      byTitle["cellphone"] ||
      byTitle["cell phone (optional)"] ||
      null;
    return { tax, hear, cell };
  } catch {
    return null;
  }
}
/**
 * Load Customer Extra Field defs with preference for App Storage; fallback to checkout-based discovery.
 */
/**
 * Load Customer Extra Field definitions from App Storage only.
 * Server handles field mapping and persistence; client only needs labels/options for UI.
 * @returns {Promise<{tax, hear, cell}>} Field definitions or nulls
 */
async function loadCustomerExtraDefsSafe() {
  if (EXTRA_FIELD_DEFS_CACHE) return EXTRA_FIELD_DEFS_CACHE;

  // Load from App Storage (public/extrafields)
  const fromStorage = loadCustomerExtraFieldDefsFromStorage();
  EXTRA_FIELD_DEFS_CACHE = fromStorage || { tax: null, hear: null, cell: null };
  return EXTRA_FIELD_DEFS_CACHE;
}
/**
 * Build registration payload for external server submission
 * @param {Object} values - Form values from getVals()
 * @returns {Object} Payload for POST /api/register
 */
function buildRegistrationServerPayload(values) {
  const storeId = Ecwid.getOwnerId();
  return {
    storeId: String(storeId),
    lang: "en",
    values: {
      name: values.name,
      companyName: values.companyName,
      postalCode: values.postalCode,
      countryCode: values.countryCode,
      phone: values.phone,
      cellPhone: values.cellPhone || "",
      taxId: values.taxId || "",
      hear: values.hear || "",
      acceptMarketing: !!values.acceptMarketing,
    },
  };
}

/**
 * POST registration to external server with idempotency and retry handling
 * @param {Object} payload - Registration payload from buildRegistrationServerPayload
 * @returns {Promise<{status: string, customerId: number, groupId?: number}>}
 * @throws {Error} If registration fails
 */
async function postRegistrationToServer(payload) {
  const token = await getStorefrontSessionToken();
  const key =
    (window.crypto && crypto.randomUUID && crypto.randomUUID()) ||
    "reg-" + Date.now() + "-" + Math.random().toString(16).slice(2);

  const res = await fetch(REG_SERVER_URL + "/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
      "Idempotency-Key": key,
    },
    body: JSON.stringify(payload),
    credentials: "omit", // not needed for our server
  });

  // Handle 202 Accepted with retry
  if (res.status === 202) {
    const retryAfter = Number(res.headers.get("Retry-After") || 2);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return postRegistrationToServer(payload); // retry with same key
  }

  // Handle errors
  if (!res.ok) {
    let err;
    try {
      err = await res.json();
    } catch (_) {}
    const msg = err?.errorMessage || "HTTP " + res.status;
    throw new Error(msg);
  }

  return res.json(); // { status, customerId, groupId }
}

function formRow(inner) {
  return `<div class="ec-form__row">${inner}</div>`;
}
function formCell({
  // Key in data object with hyphens instead of camelCase, e.g. "companyName" becomes "company-name"
  key,
  // Optional column width (numeric); if no value is set, the cell will span the full width, which is 12
  width,
  // Inner HTML
  inner,
}) {
  return `<div class="ec-form__cell ${
    width ? `ec-form__cell--${width}` : ""
  } ec-form__cell--${key}">${inner}</div>`;
}
function formMessage({
  // Element name, e.g. "organization-name"
  id,
  // Inner HTML
  inner,
}) {
  return `<div id="ec-${id}-input-msg" class="form__msg">${inner}</div>`;
}
function formControl({
  // Element name, e.g. "organization-name"
  id,
  // Inner HTML
  inner,
  className = "form-control--flexible",
}) {
  // Checkbox needs form-control--checkbox
  return `<div class="form-control ${className} form-control--type-${id}">${inner}</div>`;
}
function formLabel({
  // Element name, e.g. "organization-name"
  id,
  // Whether the field is required
  required = false,
  // Inner HTML (for backward compatibility) or label text
  inner,
  label,
}) {
  const text = inner != null ? inner : label || "";
  const req = required
    ? '<div class="marker-required marker-required--medium"></div>'
    : "";
  const opt = !required ? " (optional)" : "";
  return `<label for="ec-${id}"><div class="ec-form__title ec-header-h6">${req}${esc(
    text
  )}${opt}</div></label>`;
}
function formPlaceholder({
  // Inner HTML
  inner,
}) {
  return `<div class="form-control__placeholder"><div class="form-control__placeholder-inner">${inner}</div></div>`;
}
function textInput({
  // Element name, e.g. "organization-name"
  id,
  // Form field name, e.g. "organization"
  name,
  label,
  value = "",
  placeholder = "",
  required = false,
  type = "text",
  autocomplete = "",
}) {
  return (
    formLabel({ id, label, required }) +
    formControl({
      id,
      inner: `
      <input
        id="ec-${id}"
        class="form-control__text"
        aria-label="${esc(label)}"
        maxlength="255"
        ${autocomplete ? `autocomplete="${esc(autocomplete)}"` : ""}
        ${required ? "required" : ""}
        type="${esc(type)}"
        name="${esc(name)}"
        value="${esc(value)}"
      />${formPlaceholder({
        inner: esc(placeholder),
      })}`,
    })
  );
}
function selectInput({
  id,
  label,
  value = "",
  placeholder = "",
  // Options for the select element; and array of {value: "", label: ""}
  options = [],
  required = false,
}) {
  const req = required
    ? '<div class="marker-required marker-required--medium"></div>'
    : "";
  const opts = options
    .map(
      (o) =>
        `<option value="${esc(o.value)}" ${
          o.value === value ? "selected" : ""
        }>${esc(o.label)}</option>`
    )
    .join("");
  return (
    formLabel({ id, label, required }) +
    formControl({
      id,
      inner: `<input
        class="form-control__text"
        type="text"
        readonly=""
        tabindex="-1"
        aria-label="${esc(label)}"
      /><select
        class="form-control__select"
        name="${id}-list"
        ${required ? "required" : ""}
        aria-label="${esc(label)}"
        id="ec-${id}"
        aria-describedby="ec-${id}-input-msg"
      >${opts}</select>${formPlaceholder({
        inner: esc(placeholder),
      })}`,
    }) +
    formMessage({
      id,
      inner: "",
    })
  );
}
function checkboxInput({
  // Element name, e.g. "organization-name"
  id,
  // Form field name, e.g. "organization"
  name,
  label,
  checked = false,
}) {
  const checkboxId = `form-control__checkbox-${id}`;
  return formControl({
    id,
    className: "form-control--checkbox",
    inner: `
      <div class="form-control__checkbox-wrap">
        <input
          class="form-control__checkbox"
          type="checkbox"
          ${checked ? "checked" : ""}
          name="${name}"
          id="${checkboxId}"
        />
        <div class="form-control__checkbox-view">
          <svg
            width="27"
            height="23"
            viewBox="0 0 27 23"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              class="svg-line-check"
              d="M1.97 11.94L10.03 20 25.217 2"
              fill="none"
              fill-rule="evenodd"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
            ></path>
          </svg>
        </div>
      </div>
      <div class="form-control__inline-label">
        <label for="${checkboxId}">${esc(label)}</label>
      </div>`,
  });
}

// HTML escaping helper
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Generic HTML element helpers
function div({ class: className = "", inner = "" }) {
  return `<div class="${className}">${inner}</div>`;
}
function span({ class: className = "", inner = "" }) {
  return `<span class="${className}">${inner}</span>`;
}
function button({
  id = "",
  class: className = "",
  type = "button",
  inner = "",
}) {
  return `<button ${
    id ? `id="${id}"` : ""
  } class="${className}" type="${type}">${inner}</button>`;
}
function getCountryOptions() {
  return [
    { value: "US", label: "United States" },
    { value: "UM", label: "United States Minor Outlying Islands" },
    { value: "VI", label: "Virgin Islands, U.S." },
  ];
}

async function renderOrUpdateAccountRegister() {
  // Prevent re-entry during rendering to avoid observer loops
  if (RENDERING_ACC_FORM) return;
  RENDERING_ACC_FORM = true;

  try {
    const container = queryAccountBody();
    if (!container) return;
    const root = hijackAccountBody(container);
    if (!root) return;
    trackWholesaleEvent("wholesale_registration_view", {});
    const customer = await fetchLoggedInCustomer();
    // Prefer App Storage for extra field definitions (fallback to checkout when needed)
    const defs = await loadCustomerExtraDefsSafe();
    const model = {
      email: customer?.email || "",
      name: customer?.billingPerson?.name || customer?.name || "",
      phone: customer?.billingPerson?.phone || "",
      companyName: customer?.billingPerson?.companyName || "",
      postalCode: customer?.billingPerson?.postalCode || "",
      countryCode: customer?.billingPerson?.countryCode || "US",
      acceptMarketing:
        (customer?.isAcceptedMarketing ?? customer?.acceptMarketing) || false,
    };
    root.innerHTML = `
    <div>
      <p><span class="ec-cart-step__mandatory-fields-notice">All fields are required unless they're explicitly marked as optional.</span></p>
      <form id="wr-acc-form" class="ec-form" action onsubmit="return false">
        ${formRow(
          formCell({
            key: "email",
            inner:
              formLabel({
                id: "email-readonly",
                label: "Email",
                required: true,
              }) +
              formControl({
                id: "email-readonly",
                inner: `
                  <input
                    id="ec-email-readonly"
                    class="form-control__text"
                    type="email"
                    value="${esc(model.email)}"
                    readonly
                  />${formPlaceholder({ inner: "" })}
                `,
              }),
          })
        )}
        ${formRow(
          formCell({
            key: "country",
            inner: selectInput({
              id: "country",
              name: "country",
              label: "Country",
              value: model.countryCode,
              options: getCountryOptions(),
              required: true,
            }),
          })
        )}
        ${formRow(
          formCell({
            key: "name",
            inner: textInput({
              id: "name",
              label: "Name",
              value: model.name,
              required: true,
              autocomplete: "shipping name",
            }),
          })
        )}
        ${formRow(
          formCell({
            key: "company-name",
            inner: textInput({
              id: "company",
              name: "organization",
              label: "Company name",
              value: model.companyName,
              required: true,
              autocomplete: "shipping organization",
            }),
          })
        )}
        ${formRow(
          formCell({
            key: "zip",
            width: "4",
            inner: textInput({
              id: "zip",
              name: "postal-code",
              label: "ZIP",
              value: model.postalCode,
              required: true,
              autocomplete: "shipping postal-code",
            }),
          }) +
            formCell({
              key: "phone",
              width: "4",
              inner: textInput({
                id: "phone",
                label: "Phone",
                value: model.phone,
                required: true,
                autocomplete: "shipping tel",
                type: "tel",
              }),
            }) +
            (defs?.cell
              ? formCell({
                  key: "cell",
                  width: "4",
                  inner: textInput({
                    id: "cell",
                    label: defs.cell.title || "Cell phone",
                    placeholder: defs.cell.placeholder,
                    type: "text",
                  }),
                })
              : "")
        )}
        ${
          defs?.tax
            ? formRow(
                formCell({
                  key: "tax-id",
                  width: "4",
                  inner: textInput({
                    id: "tax-id",
                    label: defs.tax.title || "Tax ID",
                    required: true,
                    placeholder: defs.tax.placeholder,
                  }),
                })
              )
            : ""
        }
        ${
          defs?.hear
            ? formRow(
                formCell({
                  key: "hear",
                  inner:
                    // TODO: field is currently not a select type, but should be; check data
                    (defs.hear?.options?.length)
                      ? selectInput({
                          id: "wr-hear",
                          label:
                            defs.hear.title || "How did you hear about us?",
                          options: defs.hear.options.map((o) => ({
                            value: o.title,
                            label: o.title,
                          })),
                          placeholder: defs.hear.placeholder,
                        })
                      : textInput({
                          id: "wr-hear",
                          label:
                            defs.hear.title || "How did you hear about us?",
                          placeholder: defs.hear.placeholder,
                        }),
                })
              )
            : ""
        }
        ${formRow(
          formCell({
            key: "continue",
            inner: div({
              class:
                "form-control form-control--button form-control--large form-control--primary form-control--flexible form-control--done",
              inner: button({
                id: "acc-submit",
                class: "form-control__button",
                type: "button",
                inner: span({
                  class: "form-control__button-text",
                  inner: "Register",
                }),
              }),
            }),
          })
        )}
        <div id="acc-input-msg" class="form__msg"></div>
      </form>
    </div>`;
    initAccountRegisterFormUI(root);
    attachAccountRegisterHandlers(root, defs);
  } finally {
    // Allow next render after microtask
    setTimeout(() => {
      RENDERING_ACC_FORM = false;
    }, 0);
  }
}

function initAccountRegisterFormUI(root) {
  try {
    // Apply select-specific classes and arrow, and sync overlay text input value
    root.querySelectorAll(".form-control__select").forEach((sel) => {
      const control = sel.closest(".form-control");
      if (!control) return;
      control.classList.add("form-control--select");
      // Arrow
      if (!control.querySelector(".form-control__arrow")) {
        const arrow = document.createElement("div");
        arrow.className = "form-control__arrow";
        arrow.innerHTML =
          '<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><path d="M11 4L6 9 1 4" fill="none" fill-rule="evenodd" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
        control.appendChild(arrow);
      }
      // Overlay readonly input is the preceding .form-control__text
      const overlay = control.querySelector(".form-control__text");
      const sync = () => {
        const opt = sel.options[sel.selectedIndex];
        if (overlay) overlay.value = opt ? opt.text : "";
        if (!sel.value) control.classList.add("form-control--empty");
        else control.classList.remove("form-control--empty");
      };
      sel.addEventListener("change", sync);
      sync();
    });

    // Text inputs: toggle empty state
    root.querySelectorAll(".form-control__text").forEach((inp) => {
      const control = inp.closest(".form-control");
      if (!control) return;
      const toggle = () => {
        if (!inp.value) control.classList.add("form-control--empty");
        else control.classList.remove("form-control--empty");
      };
      inp.addEventListener("input", toggle);
      toggle();
    });
  } catch (e) {
    console.warn("Wholesale Reg: initAccountRegisterFormUI failed", e);
  }
}

/**
 * Resolve the key to use for an extra field definition.
 * Prefers def.key, falls back to def.title.
 */
function resolveExtraFieldKey(def) {
  if (def?.key) return def.key;
  // fallback to title if absolutely needed (least preferred)
  return String(def?.title || "").trim();
}

/**
 * Convert an extra field definition to the shape expected by Ecwid checkout.
 */
function toCheckoutExtraFieldDef(def, { forceSectionsFor } = {}) {
  if (!def) return null;
  const isSelect = def.type === "select";
  // Provide safe defaults when sections are missing
  const defaultsByTitle = {
    "tax id": {
      checkoutDisplaySection: "email",
      orderDetailsDisplaySection: "customer_info",
      orderBy: 2,
    },
    "how did you hear about us?": {
      checkoutDisplaySection: "payment_details",
      orderDetailsDisplaySection: "billing_info",
      orderBy: 3,
    },
    "cell phone": {
      checkoutDisplaySection: "shipping_details",
      orderDetailsDisplaySection: "customer_info",
      orderBy: 4,
    },
  };
  const lowTitle = (def.title || "").toLowerCase();
  const fallback = defaultsByTitle[lowTitle] || {};

  return {
    type: def.type || "text",
    title: def.title || "",
    checkoutDisplaySection:
      def.checkoutDisplaySection || fallback.checkoutDisplaySection || "email",
    cpField: def.cpField ?? true,
    options: isSelect && def.options ? def.options : undefined,
    textPlaceholder: def.placeholder || "",
    available: def.available ?? true,
    required: !!def.required,
    orderDetailsDisplaySection:
      def.orderDetailsDisplaySection ||
      fallback.orderDetailsDisplaySection ||
      "customer_info",
    showInInvoice: def.showInInvoice ?? false,
    showInNotifications: def.showInNotifications ?? false,
    saveToCustomerProfile: def.saveToCustomerProfile ?? false,
    orderBy:
      typeof def.orderBy === "number" ? def.orderBy : fallback.orderBy ?? 0,
  };
}

function attachAccountRegisterHandlers(root, defs) {
  const getVals = () => ({
    name: document.getElementById("ec-name")?.value.trim() || "",
    phone: document.getElementById("ec-phone")?.value.trim() || "",
    companyName: document.getElementById("ec-company")?.value.trim() || "",
    postalCode: document.getElementById("ec-zip")?.value.trim() || "",
    countryCode: document.getElementById("ec-country")?.value || "US",
    acceptMarketing:
      document.getElementById("form-control__checkbox-accept-marketing")
        ?.checked || false,
    taxId: document.getElementById("ec-tax-id")?.value.trim() || "",
    cellPhone: document.getElementById("ec-cell")?.value.trim() || "",
    hear: document.getElementById("ec-wr-hear")?.value || "",
  });

  const clearErrors = () => {
    root
      .querySelectorAll(".form-control--error")
      .forEach((el) => el.classList.remove("form-control--error"));
    root.querySelectorAll(".form__msg--error").forEach((el) => el.remove());
    root
      .querySelectorAll("[aria-invalid]")
      .forEach((el) => el.removeAttribute("aria-invalid"));
  };

  const showFieldError = (fieldId, message) => {
    const input = document.getElementById(fieldId);
    if (!input) return;
    const control = input.closest(".form-control");
    const msgId = `${fieldId}-input-msg`;

    // Find or create the error message node
    let errDiv = document.getElementById(msgId);
    if (!errDiv) {
      errDiv = document.createElement("div");
      errDiv.id = msgId;
      errDiv.className = "form__msg form__msg--error";
      // Append to control's parent (for selects) or control itself (for inputs)
      (control?.parentElement || control || input).appendChild(errDiv);
    } else {
      // Reuse existing message node, just add error class
      errDiv.classList.add("form__msg--error");
    }

    errDiv.textContent = message;
    if (control) control.classList.add("form-control--error");
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", msgId);
  };

  const validateCountryCode = (code) => {
    const validCodes = getCountryOptions();
    return validCodes.some((o) => o.value === code);
  };

  const btn = root.querySelector("#acc-submit");
  const msg = root.querySelector("#acc-input-msg");

  btn?.addEventListener("click", async () => {
    clearErrors();
    const v = getVals();

    // Validate required fields
    let firstInvalid = null;
    const setInvalid = (id, message) => {
      const eid = id.startsWith("ec-") ? id : `ec-${id}`;
      showFieldError(eid, message);
      if (!firstInvalid) firstInvalid = document.getElementById(eid);
    };

    if (!v.name) setInvalid("name", "Name is required");
    if (!v.phone) setInvalid("phone", "Phone is required");
    if (!v.companyName) setInvalid("company", "Company name is required");
    if (!v.postalCode) setInvalid("zip", "ZIP is required");
    if (!v.countryCode) setInvalid("country", "Country is required");
    else if (!validateCountryCode(v.countryCode))
      setInvalid("country", "Invalid country code");
    if (defs.tax?.required && !v.taxId)
      setInvalid("tax-id", "Tax ID is required");

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    trackWholesaleEvent("wholesale_registration_submit", {});
    msg.textContent = "Saving…";
    msg.className = "form__msg";

    try {
      const payload = buildRegistrationServerPayload(v);
      const res = await postRegistrationToServer(payload);
      // Server returns: { status, customerId, groupId }

      trackWholesaleEvent("wholesale_registration_success", {});

      // Refresh Ecwid config to reflect updated customer group
      if (typeof Ecwid.refreshConfig === "function") {
        await new Promise((resolve) => setTimeout(resolve, 500));
        Ecwid.refreshConfig();
      }

      // Force customer data refresh to update wholesale status immediately
      if (Ecwid?.Customer?.get) {
        Ecwid.Customer.get(function () {
          console.log("Wholesale Reg: Customer data refreshed after registration");
        });
      }

      // Set persistent success banner (survives navigation for 5s)
      setRegistrationBanner(
        "success",
        "Your wholesale registration has been submitted.",
        5000
      );

      // Redirect to /products
      await new Promise((resolve) => setTimeout(resolve, 500));
      // TODO: uncomment when done debugging
      // window.location.href = "/products";
    } catch (err) {
      trackWholesaleEvent("wholesale_registration_failure", {
        error: err.message,
      });
      const errorMsg = "Registration failed. " + (err?.message || "Please try again.");
      msg.textContent = errorMsg;
      msg.className = "form__msg form__msg--error";

      // Set persistent error banner (survives navigation for 5s)
      setRegistrationBanner("error", errorMsg, 5000);
    }
  });
}

// Deprecated: Replaced by setRegistrationBanner + restoreRegistrationBanner system (v2.2)
// function showRegistrationSuccessBanner() { ... }
