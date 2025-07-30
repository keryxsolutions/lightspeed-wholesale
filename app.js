(function() {
  // Exit if the main Ecwid object isn't ready.
  if (typeof window.Ecwid === 'undefined' || typeof window.Ecwid.getStoreId !== 'function') {
    return;
  }

  // Dynamically get the store ID from the Ecwid object.
  const storeId = window.Ecwid.getStoreId();
  if (!storeId) {
    return;
  }

  // Construct the session cookie name dynamically.
  const LOGIN_COOKIE_NAME = `ec-${storeId}-session`;

  /**
   * Checks if a cookie with the given name exists.
   * @param {string} cookieName The name of the cookie to check for.
   * @returns {boolean} True if the cookie exists, false otherwise.
   */
  function hasLoginCookie(cookieName) {
    return document.cookie.split(';').some(item => item.trim().startsWith(cookieName + '='));
  }
  
  // If the user is a guest (not logged in), hide prices and buy buttons.
  if (!hasLoginCookie(LOGIN_COOKIE_NAME)) {
    
    // Ensure the config objects exist before we try to modify them.
    window.Ecwid.config = window.Ecwid.config || {};
    window.Ecwid.config.design = window.Ecwid.config.design || {};

    console.log(`Guest on store ${storeId}. Hiding prices via Ecwid.config.`);

    // Hide prices on product list/category pages
    Ecwid.config.design.product_list_price_behavior = "HIDE";
    
    // Hide "Buy Now" buttons on product list/category pages
    Ecwid.config.design.product_list_buybutton_behavior = "HIDE";

    // Hide prices on the product details pages
    Ecwid.config.design.product_details_show_product_price = false;
    
    // Hide "Add to Bag" button on the product details pages
    Ecwid.config.design.product_details_show_buy_button = false;
  }
})();
