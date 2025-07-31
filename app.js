// This script is designed to run in a Lightspeed eCom Custom App.
// It assumes that product prices are turned OFF by default in the store's design settings.
// Its purpose is to turn prices ON only for customers who are logged in.

Ecwid.OnAPILoaded.add(function() {
  console.log("Wholesale App Loaded: Checking login status to potentially show prices.");

  // Check if the customer is logged into their account.
  if (Ecwid.isLoggedIn()) {
    
    console.log("Logged-in user detected. Forcing prices and buy buttons to be visible.");

    // Ensure the config objects exist before we modify them.
    window.Ecwid.config = window.Ecwid.config || {};
    window.Ecwid.config.design = window.Ecwid.config.design || {};

    // --- Configuration to SHOW prices and buttons ---
    
    // Show prices on product list/category pages
    Ecwid.config.design.product_list_price_behavior = "SHOW";
    
    // Show "Buy Now" buttons on product list/category pages
    Ecwid.config.design.product_list_buybutton_behavior = "SHOW";

    // Show prices on the product details pages
    Ecwid.config.design.product_details_show_product_price = true;
    
    // Show "Add to Bag" button on the product details pages
    Ecwid.config.design.product_details_show_buy_button = true;

    // This critical function tells the storefront to apply the new configuration
    // and re-render the product widgets.
    Ecwid.refreshConfig();
  } else {
    console.log("Guest user detected. Prices will remain hidden by default.");
  }
});
