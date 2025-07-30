Ecwid.OnAPILoaded.add(function () {
  // Your custom code goes here
  console.log("Ecwid JS API is loaded. Running custom script.");

  // Example: Check login status and hide prices
  if (!Ecwid.isLoggedIn) {
    // Implement your logic to find and remove price elements from the DOM
    // For example:
    document
      .querySelectorAll(".ecwid-productBrowser-price, .ecwid-price-value")
      .forEach(function (element) {
        element.remove();
      });
    document
      .querySelectorAll(
        ".ecwid-btn--add-to-cart, .ecwid-add-to-cart-button-container"
      )
      .forEach(function (element) {
        element.remove();
      });
    // Optionally inject a "Login to see price" message
  }
});
