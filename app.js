(function() {
  /**
   * Checks if a cookie with the given name exists.
   * @param {string} cookieName The name of the cookie to check for.
   * @returns {boolean} True if the cookie exists, false otherwise.
   */
  function hasLoginCookie(cookieName) {
    return document.cookie.split(';').some(item => item.trim().startsWith(cookieName + '='));
  }

  // Using the cookie name identified from your screenshot.
  const LOGIN_COOKIE_NAME = 'ec-121845055-session'; 
  
  // If the user is a guest (not logged in), hide prices and buy buttons.
  if (!hasLoginCookie(LOGIN_COOKIE_NAME)) {
    
    // Ensure the Ecwid.config object exists before we try to modify it.
    window.Ecwid = window.Ecwid || {};
    Ecwid.config = Ecwid.config || {};
    Ecwid.config.design = Ecwid.config.design || {};

    console.log("Guest user detected. Hiding prices via Ecwid.config.");

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
