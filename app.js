/* Lightspeed eCom Custom App JS - Wholesale Portal */

/* This script assumes that product prices are turned OFF by default in the store's design settings. */
/* Added category banner functionality for full-width banners with text overlay. */

// App client ID (from your Ecwid app). Uses a single constant per docs.
const clientId = "custom-app-121843055-1";

Ecwid.OnAPILoaded.add(function () {
  // Initialize robust wholesale price visibility logic
  initializeWholesalePriceVisibility();

  // Initialize category banner functionality (preserved)
  initializeCategoryBanner();

  // Initialize product tag system
  initializeProductTagSystem();
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
