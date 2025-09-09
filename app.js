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
    if (document.getElementById('wholesale-hide-css')) return;
    const style = document.createElement('style');
    style.id = 'wholesale-hide-css';
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
    const style = document.getElementById('wholesale-hide-css');
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
        console.warn("Wholesale: Ecwid.Customer API not available after polling.");
      }
    }
    tryGet();
  }

  // Main logic: check login and set visibility
  function updateWholesaleVisibility() {
    Ecwid.Customer.get(function(customer) {
      const isLoggedIn = customer && customer.email;
      if (isLoggedIn) {
        setWholesaleConfig(true);
        removeWholesaleHidingCSS();
        console.log("Wholesale: Logged-in user, showing prices and buy buttons.");
      } else {
        setWholesaleConfig(false);
        injectWholesaleHidingCSS();
        console.log("Wholesale: Guest user, hiding prices, buy buttons, and price filter.");
      }
    });
  }

  // Initial run after API is ready
  pollForCustomerAPI(updateWholesaleVisibility);

  // Re-run on SPA navigation/page changes
  Ecwid.OnPageLoaded.add(function() {
    pollForCustomerAPI(updateWholesaleVisibility);
  });
}

/*****************************************************************************/

// This function creates a single, paid test order via the eCom API.
function runApiOrderSyncTest() {
  // --- CONFIGURATION: Replace these values ---
  const TEST_PRODUCT_ID = 770748555; // 👈 Replace with your Test Product ID
  const TEST_CUSTOMER_ID = 310808192; // 👈 Replace with your Test Customer ID
  const TEST_PRODUCT_PRICE = 0.01; // Using $0.01 for the test
  // -----------------------------------------

  // Get store_id and access_token from the app's configuration
  const storeId = Ecwid.getAppConfig("store_id");
  const accessToken = Ecwid.getAppConfig("access_token");

  console.log("Starting API order sync test...");
  alert(
    "Creating a $0.01 test order. Check the console and your Lightspeed Retail reports in a few minutes."
  );

  // Define the order payload
  const orderData = {
    customerId: TEST_CUSTOMER_ID,
    paymentStatus: "PAID",
    fulfillmentStatus: "AWAITING_PROCESSING",
    orderComments: "API SYNC TEST - " + new Date().toISOString(),
    items: [
      {
        productId: TEST_PRODUCT_ID,
        price: TEST_PRODUCT_PRICE,
        quantity: 1,
      },
    ],
  };

  // The API endpoint for creating an order
  const apiUrl = `https://app.ecwid.com/api/v3/${storeId}/orders`;

  // Make the API call using fetch
  fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(orderData),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.orderId) {
        console.log(
          "SUCCESS: Test order created in Lightspeed eCom. Order ID:",
          data.orderId
        );
        alert(
          "SUCCESS: Test order #" +
            data.orderId +
            " created in Lightspeed eCom. Now, check for it in Lightspeed Retail."
        );
      } else {
        console.error("ERROR: Failed to create order.", data);
        alert(
          "ERROR: Could not create the test order. Check the browser console (F12) for details."
        );
      }
    })
    .catch((error) => {
      console.error("FETCH ERROR:", error);
      alert("A network error occurred. Check the browser console (F12).");
    });
}

// You can add a button to your app's HTML to trigger this function.
// <button onclick="runApiOrderSyncTest()">Run API Order Sync Test</button>

/*****************************************************************************/
// CATEGORY BANNER FUNCTIONALITY
/*****************************************************************************/

function initializeCategoryBanner() {
  console.log('Category Banner: Initializing production banner functionality (API-based, secure token)');

  // Inject CSS styles for category banner
  injectCategoryBannerStyles();

  // Listen for category page loads
  Ecwid.OnPageLoaded.add(function(page) {
    if (page.type === 'CATEGORY' && page.categoryId) {
      console.log('Category Banner: Detected category page, ID:', page.categoryId);
      setTimeout(function() {
        fetchAndCreateCategoryBanner_Prod(page.categoryId);
      }, 400);

      // Additional check after a longer delay for slow loading
      setTimeout(function() {
        fetchAndCreateCategoryBanner_Prod(page.categoryId);
      }, 1800);
    }
  });

  // Initial check in case DOM is ready before Ecwid SPA event
  setTimeout(function() {
    const page = window.Ecwid && Ecwid.getLastLoadedPage && Ecwid.getLastLoadedPage();
    if (page && page.type === 'CATEGORY' && page.categoryId) {
      fetchAndCreateCategoryBanner_Prod(page.categoryId);
    }
  }, 800);
}

// Fetch category data from Ecwid API and create banner (production version)
function fetchAndCreateCategoryBanner_Prod(categoryId) {
  // Find the description container and overlay
  const descContainer = document.querySelector('.grid__description');
  if (!descContainer) {
    console.log('Category Banner: No .grid__description found, aborting banner creation.');
    return;
  }
  if (descContainer.classList.contains('category-banner-container')) {
    console.log('Category Banner: Banner already exists for this category.');
    return;
  }
  const overlay = descContainer.querySelector('.grid__description-inner');
  if (!overlay) {
    console.log('Category Banner: No .grid__description-inner found inside .grid__description.');
    return;
  }

  // Use hardcoded store ID and public token for secure API access
  const storeId = "121843055";
  const publicToken = "public_nupsXaESCGidBYB7gUDny23ahRgXR5Yp";

  const apiUrl = `https://app.ecwid.com/api/v3/${storeId}/categories/${categoryId}`;
  console.log('Category Banner: Fetching category data from API:', apiUrl);

  fetch(apiUrl, {
    headers: {
      'Authorization': `Bearer ${publicToken}`
    }
  })
    .then(resp => resp.json())
    .then(data => {
      if (!data || (!data.imageUrl && !data.originalImageUrl)) {
        console.warn('Category Banner: No image found in API response for category', categoryId, data);
        return;
      }
      // Prefer imageUrl, fallback to originalImageUrl
      const imageUrl = data.imageUrl || data.originalImageUrl;
      if (!imageUrl) {
        console.warn('Category Banner: No usable image URL in API response for category', categoryId);
        return;
      }
      // Create or update the banner
      createApiCategoryBanner(descContainer, overlay, imageUrl);
    })
    .catch(err => {
      console.error('Category Banner: Failed to fetch category data from API.', err);
    });
}

// Build the banner using the fetched image and description overlay
function createApiCategoryBanner(descContainer, overlay, imageUrl) {
  // Add banner container class
  descContainer.classList.add('working-banner-container');

  // Remove any previous banner images
  const oldBannerImg = descContainer.querySelector('.category-banner-img-from-api');
  if (oldBannerImg) oldBannerImg.remove();

  // Create the image element
  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = 'Category Banner';
  img.className = 'category-banner-img-from-api';
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  img.style.objectPosition = 'center';
  img.style.display = 'block';

  // Insert image as first child of banner container
  descContainer.insertBefore(img, descContainer.firstChild);

  // Add overlay classes (use minimal class for new CSS)
  overlay.classList.add('working-banner-overlay', 'category-banner-text');
  overlay.style = '';

  // Hide any other siblings except the overlay and image
  Array.from(descContainer.children).forEach(child => {
    if (child !== img && child !== overlay) {
      child.style.display = 'none';
    }
  });

  // Log success
  console.log('Category Banner: Banner created with API image:', imageUrl);

  // Force reflow
  setTimeout(function() {
    descContainer.offsetHeight;
  }, 100);
}

function injectCategoryBannerStyles() {
  // Only load external app.css for category banner styles
  if (!document.querySelector('link[href="https://keryxsolutions.github.io/lightspeed-wholesale/app.css"]')) {
    const localCssLink = document.createElement('link');
    localCssLink.rel = 'stylesheet';
    localCssLink.href = 'https://keryxsolutions.github.io/lightspeed-wholesale/app.css';
    localCssLink.onload = function() {
      console.log('Category Banner: External app.css loaded successfully');
    };
    localCssLink.onerror = function() {
      console.warn('Category Banner: Failed to load external app.css');
    };
    document.head.appendChild(localCssLink);
  }

  // Load Google Fonts if not already present
  if (!document.querySelector('link[href*="Cormorant+Garamond"]')) {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
}


function createBannerLayout(imageElement, descriptionElement) {
  const imageContainer = imageElement.closest('.ecwid-category-image, .ec-category-image, .category-image, .ec-category, .ecwid-category') || imageElement.parentElement;
  
  try {
    // Create banner structure
    const bannerContainer = document.createElement('div');
    bannerContainer.className = 'category-banner-container';
    
    const overlayContainer = document.createElement('div');
    overlayContainer.className = 'category-banner-overlay';
    
    const textContainer = document.createElement('div');
    textContainer.className = 'category-banner-text';
    
    // Get description content (preserve HTML formatting)
    let descriptionContent = descriptionElement.innerHTML.trim();
    
    // Clean up unwanted elements but preserve formatting
    descriptionContent = descriptionContent.replace(/<script[^>]*>.*?<\/script>/gi, '');
    descriptionContent = descriptionContent.replace(/<style[^>]*>.*?<\/style>/gi, '');
    
    // Remove any existing category banner classes to prevent conflicts
    descriptionContent = descriptionContent.replace(/class=["']?[^"']*category-banner[^"']*["']?/gi, '');
    
    // Set the text content
    textContainer.innerHTML = descriptionContent;
    
    // Clone the image and ensure it has proper attributes
    const clonedImage = imageElement.cloneNode(true);
    clonedImage.style.cssText = ''; // Clear any inline styles
    
    // Build the structure
    overlayContainer.appendChild(textContainer);
    bannerContainer.appendChild(clonedImage);
    bannerContainer.appendChild(overlayContainer);
    
    // Replace original with banner
    if (imageContainer && imageContainer.parentNode) {
      imageContainer.parentNode.replaceChild(bannerContainer, imageContainer);
      
      // Hide original description
      descriptionElement.style.display = 'none';
      
      console.log('Category Banner: Banner created successfully');
      
      // Add a small delay to ensure styles are applied
      setTimeout(function() {
        // Force a reflow to ensure proper rendering
        bannerContainer.offsetHeight;
      }, 100);
      
    } else {
      console.error('Category Banner: Could not find parent container');
    }
    
  } catch (error) {
    console.error('Category Banner: Error creating banner layout:', error);
  }
}
