// This script is designed to run in a Lightspeed eCom Custom App.
// It assumes that product prices are turned OFF by default in the store's design settings.
// Added category banner functionality for full-width banners with text overlay.

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
  console.log('Category Banner: Initializing banner functionality');
  
  // Inject CSS styles for category banner
  injectCategoryBannerStyles();
  
  // Watch for page changes to apply banner to dynamically loaded content
  Ecwid.OnPageLoaded.add(function(page) {
    console.log('Category Banner: Page loaded', page.type);
    if (page.type === 'CATEGORY') {
      setTimeout(function() {
        checkAndCreateBanner();
      }, 500);
      
      // Additional check after a longer delay for slow loading
      setTimeout(function() {
        checkAndCreateBanner();
      }, 2000);
    }
  });
  
  // Use MutationObserver to watch for dynamically loaded content
  const observer = new MutationObserver(function(mutations) {
    let shouldCheck = false;
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) { // Element node
            if (node.querySelector && (
              node.querySelector('.ecwid-category-image, .ec-category-image, .category-image') ||
              node.querySelector('.ecwid-category-description, .ec-category-description, .category-description') ||
              node.classList.contains('ecwid-category-image') ||
              node.classList.contains('ec-category-image') ||
              node.classList.contains('ecwid-category-description') ||
              node.classList.contains('ec-category-description')
            )) {
              shouldCheck = true;
            }
          }
        });
      }
    });
    
    if (shouldCheck) {
      setTimeout(checkAndCreateBanner, 300);
    }
  });
  
  // Start observing once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  } else {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Initial checks at different intervals
  setTimeout(checkAndCreateBanner, 500);
  setTimeout(checkAndCreateBanner, 1500);
  setTimeout(checkAndCreateBanner, 3000);
}

function injectCategoryBannerStyles() {
  // Check if external CSS is already loaded
  const externalCssUrl = 'https://keryxsolutions.github.io/lightspeed-wholesale/app.css';
  const cssAlreadyLoaded = document.querySelector(`link[href="${externalCssUrl}"]`);
  
  if (!cssAlreadyLoaded) {
    // Try to load external CSS first
    const externalCssLink = document.createElement('link');
    externalCssLink.rel = 'stylesheet';
    externalCssLink.href = externalCssUrl;
    externalCssLink.onload = function() {
      console.log('Category Banner: External CSS loaded successfully');
    };
    externalCssLink.onerror = function() {
      console.log('Category Banner: External CSS failed to load, using inline styles');
      loadInlineStyles();
    };
    document.head.appendChild(externalCssLink);
  }
  
  // Load Google Fonts
  if (!document.querySelector('link[href*="Cormorant+Garamond"]')) {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  
  function loadInlineStyles() {
    const styles = `
      /* Category Banner with Text Overlay - Inline Fallback */
      .ecwid-category-title, .ec-page-title, .ec-category-title {
        display: none !important;
      }
      
      .category-banner-container {
        position: relative;
        width: 100vw;
        margin-left: 50%;
        transform: translateX(-50%);
        height: 400px;
        overflow: hidden;
        margin-bottom: 2rem;
        z-index: 1;
      }
      
      .category-banner-container .ecwid-category-image img,
      .category-banner-container .ec-category-image img,
      .category-banner-container img {
        width: 100% !important;
        height: 400px !important;
        object-fit: cover !important;
        object-position: center !important;
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
      }
      
      .category-banner-overlay {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10;
        text-align: center;
        max-width: 80%;
        padding: 30px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 10px;
        backdrop-filter: blur(2px);
        -webkit-backdrop-filter: blur(2px);
      }
      
      .category-banner-text {
        font-family: "Cormorant Garamond", system-ui, "Segoe UI", Roboto, Arial, sans-serif !important;
        font-size: 32px !important;
        font-weight: 400 !important;
        color: white !important;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
        margin: 0 !important;
        padding: 0 !important;
        line-height: 1.4 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 50px;
        text-align: center !important;
      }
      
      .category-banner-text strong {
        font-weight: bold !important;
        font-family: inherit !important;
      }
      
      .category-banner-text em {
        font-style: italic !important;
        font-family: inherit !important;
      }
      
      .category-banner-text p {
        margin: 0 !important;
        padding: 0 !important;
        font-family: inherit !important;
        font-size: inherit !important;
        color: inherit !important;
        line-height: inherit !important;
      }
      
      body .category-banner-text,
      .ec-wrapper .category-banner-text,
      .ecwid .category-banner-text {
        font-family: "Cormorant Garamond", system-ui, "Segoe UI", Roboto, Arial, sans-serif !important;
        font-size: 32px !important;
        color: white !important;
      }
      
      @media (max-width: 1024px) {
        .category-banner-container {
          height: 350px;
        }
        .category-banner-container .ecwid-category-image img,
        .category-banner-container .ec-category-image img,
        .category-banner-container img {
          height: 350px !important;
        }
        .category-banner-text {
          font-size: 28px !important;
        }
        .category-banner-overlay {
          max-width: 85%;
          padding: 25px;
        }
      }
      
      @media (max-width: 768px) {
        .category-banner-container {
          height: 250px;
          margin-bottom: 1.5rem;
        }
        .category-banner-container .ecwid-category-image img,
        .category-banner-container .ec-category-image img,
        .category-banner-container img {
          height: 250px !important;
        }
        .category-banner-text {
          font-size: 24px !important;
        }
        .category-banner-overlay {
          max-width: 90%;
          padding: 20px;
        }
      }
      
      @media (max-width: 480px) {
        .category-banner-container {
          height: 200px;
          margin-bottom: 1rem;
        }
        .category-banner-container .ecwid-category-image img,
        .category-banner-container .ec-category-image img,
        .category-banner-container img {
          height: 200px !important;
        }
        .category-banner-text {
          font-size: 20px !important;
        }
        .category-banner-overlay {
          max-width: 95%;
          padding: 15px;
        }
      }
      
      .category-banner-container ~ .ecwid-category-description,
      .category-banner-container ~ .ec-category-description,
      .category-banner-container ~ .category-description {
        display: none !important;
      }
    `;
    
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    styleSheet.setAttribute('data-category-banner', 'inline');
    document.head.appendChild(styleSheet);
  }
}

function checkAndCreateBanner() {
  // Enhanced selectors to catch more theme variations
  const categoryImageSelectors = [
    '.ecwid-category-image img',
    '.ec-category-image img',
    '.category-image img',
    '.ec-category .ec-category-image img',
    '.category-page .category-image img',
    '.ecwid-category .ecwid-category-image img'
  ];
  
  const categoryDescriptionSelectors = [
    '.ecwid-category-description',
    '.ec-category-description',
    '.category-description',
    '.ec-category .ec-category-description',
    '.category-page .category-description',
    '.ecwid-category .ecwid-category-description'
  ];
  
  let categoryImage = null;
  let categoryDescription = null;
  
  // Find category image
  for (let selector of categoryImageSelectors) {
    categoryImage = document.querySelector(selector);
    if (categoryImage) {
      console.log('Category Banner: Found category image with selector:', selector);
      break;
    }
  }
  
  // Find category description
  for (let selector of categoryDescriptionSelectors) {
    categoryDescription = document.querySelector(selector);
    if (categoryDescription && categoryDescription.textContent.trim()) {
      console.log('Category Banner: Found category description with selector:', selector);
      break;
    }
  }
  
  // Create banner if both elements exist and banner hasn't been created yet
  if (categoryImage && categoryDescription && !categoryImage.closest('.category-banner-container')) {
    console.log('Category Banner: Creating banner layout');
    createBannerLayout(categoryImage, categoryDescription);
  } else {
    if (!categoryImage) console.log('Category Banner: No category image found');
    if (!categoryDescription) console.log('Category Banner: No category description found');
    if (categoryImage && categoryImage.closest('.category-banner-container')) console.log('Category Banner: Banner already exists');
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
