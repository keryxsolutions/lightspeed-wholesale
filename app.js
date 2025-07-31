// This script is designed to run in a Lightspeed eCom Custom App.
// It assumes that product prices are turned OFF by default in the store's design settings.

Ecwid.OnAPILoaded.add(function() {
    console.log("Wholesale App Loaded: Checking login status to manage price visibility.");
  
    // Check if the customer is logged into their account.
    if (Ecwid.isLoggedIn()) {
      
      console.log("Logged-in user detected. Forcing prices and buy buttons to be visible.");
  
      // This is the logic for your approved, logged-in wholesalers.
      // It turns the prices and buttons back ON.
      window.Ecwid.config = window.Ecwid.config || {};
      window.Ecwid.config.design = window.Ecwid.config.design || {};
  
      Ecwid.config.design.product_list_price_behavior = "SHOW";
      Ecwid.config.design.product_list_buybutton_behavior = "SHOW";
      Ecwid.config.design.product_details_show_product_price = true;
      Ecwid.config.design.product_details_show_buy_button = true;
  
      // Apply the new configuration to the storefront.
      Ecwid.refreshConfig();
  
    } else {
  
      console.log("Guest user detected. Setting config to HIDE and injecting CSS safety net.");
  
      // This is the new, more robust logic for non-logged-in users.
      window.Ecwid.config = window.Ecwid.config || {};
      window.Ecwid.config.design = window.Ecwid.config.design || {};
  
      // 1. Explicitly set the configuration to HIDE.
      // This ensures the application's internal state is correct.
      Ecwid.config.design.product_list_price_behavior = "HIDE";
      Ecwid.config.design.product_list_buybutton_behavior = "HIDE";
      Ecwid.config.design.product_details_show_product_price = false;
      Ecwid.config.design.product_details_show_buy_button = false;
      
      // 2. Inject a CSS "safety net" to visually hide any dynamically loaded elements.
      const styles = `
        .ecwid-productBrowser-price,
        .ecwid-price-value,
        .ecwid-btn--add-to-cart,
        .ecwid-add-to-cart-button-container,
        .product-card-buy-icon {
          display: none !important;
        }
      `;
  
      const styleSheet = document.createElement("style");
      styleSheet.innerText = styles;
      document.head.appendChild(styleSheet);
    }
  });
