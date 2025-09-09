/* Lightspeed eCom Custom App JS - Wholesale Portal */

/* This script assumes that product prices are turned OFF by default in the store's design settings. */
/* Added category banner functionality for full-width banners with text overlay. */

Ecwid.OnAPILoaded.add(function () {
  console.log(
    "Wholesale App Loaded: Initializing price visibility and category banner."
  );

  // Initialize robust wholesale price visibility logic
  initializeWholesalePriceVisibility();

  // Initialize category banner functionality (preserved)
  initializeCategoryBanner();
});

/*****************************************************************************/

function initializeWholesalePriceVisibility() {
  // Helper: inject CSS to hide prices, buy buttons, and price filter widget
  function injectWholesaleHidingCSS() {
    if (document.getElementById("wholesale-hide-css")) return;
    const style = document.createElement("style");
    style.id = "wholesale-hide-css";
    style.innerText = `
      /* Hide product prices, buy buttons, and price filter for guests */
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
    window.ec = window.ec || {};
    window.ec.storefront = window.ec.storefront || {};
    window.ec.storefront.config = window.ec.storefront.config || {};
    const config = window.ec.storefront.config;
    config.product_list_price_behavior = show ? "SHOW" : "HIDE";
    config.product_list_buybutton_behavior = show ? "SHOW" : "HIDE";
    config.product_details_show_product_price = !!show;
    config.product_details_show_buy_button = !!show;
    if (typeof Ecwid.refreshConfig === "function") Ecwid.refreshConfig();
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
        console.log(
          "Wholesale: Logged-in user, showing prices and buy buttons."
        );
      } else {
        setWholesaleConfig(false);
        injectWholesaleHidingCSS();
        console.log(
          "Wholesale: Guest user, hiding prices, buy buttons, and price filter."
        );
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
  console.log(
    "Category Banner: Initializing production banner functionality (API-based, secure token)"
  );

  // Inject CSS styles for category banner
  injectCategoryBannerStyles();

  // Listen for category page loads
  Ecwid.OnPageLoaded.add(function (page) {
    if (page.type === "CATEGORY" && page.categoryId) {
      console.log(
        "Category Banner: Detected category page, ID:",
        page.categoryId
      );
      setTimeout(function () {
        fetchAndCreateCategoryBanner_Prod(page.categoryId);
      }, 400);

      // Additional check after a longer delay for slow loading
      setTimeout(function () {
        fetchAndCreateCategoryBanner_Prod(page.categoryId);
      }, 1800);
    }
  });

  // Initial check in case DOM is ready before Ecwid SPA event
  setTimeout(function () {
    const page =
      window.Ecwid && Ecwid.getLastLoadedPage && Ecwid.getLastLoadedPage();
    if (page && page.type === "CATEGORY" && page.categoryId) {
      fetchAndCreateCategoryBanner_Prod(page.categoryId);
    }
  }, 800);
}

// Fetch category data from Ecwid API and create banner (production version)
function fetchAndCreateCategoryBanner_Prod(categoryId) {
  const parentContainer = document.querySelector(".ecwid-productBrowser-head");
  if (!parentContainer) {
    console.log(
      "Category Banner: No .ecwid-productBrowser-head found, aborting banner creation."
    );
    return;
  }

  // Find the description container and overlay
  const descContainer = document.querySelector(".grid__description");
  if (!descContainer) {
    console.log(
      "Category Banner: No .grid__description found, aborting banner creation."
    );
    return;
  }

  // Check if banner already exists
  if (parentContainer.classList.contains("category-banner-container")) {
    console.log("Category Banner: Banner already exists for this category.");
    return;
  }

  // Use hardcoded store ID and public token for secure API access
  const storeId = "121843055";
  const publicToken = "public_nupsXaESCGidBYB7gUDny23ahRgXR5Yp";

  const apiUrl = `https://app.ecwid.com/api/v3/${storeId}/categories/${categoryId}`;
  console.log("Category Banner: Fetching category data from API:", apiUrl);

  fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${publicToken}`,
    },
  })
    .then((resp) => resp.json())
    .then((data) => {
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
      // Create or update the banner
      createApiCategoryBanner(parentContainer, descContainer, imageUrl);
    })
    .catch((err) => {
      console.error(
        "Category Banner: Failed to fetch category data from API.",
        err
      );
    });
}

// Build the banner using the fetched image and description overlay
function createApiCategoryBanner(descContainer, overlay, imageUrl) {
  // Add banner container class
  descContainer.classList.add("category-banner-container");

  // Remove any previous banner images
  const oldBannerImg = descContainer.querySelector(
    ".category-banner-img-from-api"
  );
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
  wrapper.appendChild(overlay);
  descContainer.insertBefore(wrapper, descContainer.firstChild);

  // Add overlay classes (use minimal class for new CSS)
  overlay.classList.add("category-banner-text");
  overlay.style = "";

  // Log success
  console.log("Category Banner: Banner created with API image:", imageUrl);

  // Force reflow
  setTimeout(function () {
    descContainer.offsetHeight;
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
    localCssLink.onload = function () {
      console.log("Category Banner: External app.css loaded successfully");
    };
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
