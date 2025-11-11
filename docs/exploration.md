# Exploration

## Checkout process

1. https://espritcreations.company.site/products/cart

   - email
   - tax id (custom)
   - POST to https://app.ecwid.com/storefront/api/v1/121843055/customer/update
     - Payload:

```json
{
  "checkout": {
    "extraFields": {
      "ecwid_order_pickup_time": {
        "title": "_msg_ShippingDetails.pickup_date_time",
        "type": "DATETIME",
        "required": true,
        "available": false,
        "checkoutDisplaySection": "pickup_details",
        "orderDetailsDisplaySection": "shipping_info"
      },
      "ecwid_order_delivery_time_interval_start": {
        "title": "_msg_ShippingDetails.delivery_date_time",
        "type": "DATETIME",
        "required": true,
        "available": false,
        "checkoutDisplaySection": "shipping_methods",
        "orderDetailsDisplaySection": "shipping_info"
      },
      "3w9kla3": {
        "type": "text",
        "title": "Tax ID",
        "checkoutDisplaySection": "email",
        "cpField": true,
        "textPlaceholder": "Enter your tax identification number",
        "available": true,
        "required": true,
        "orderDetailsDisplaySection": "customer_info",
        "showInInvoice": false,
        "showInNotifications": false,
        "saveToCustomerProfile": false,
        "orderBy": 2
      },
      "bp4q9w3": {
        "type": "select",
        "title": "How did you hear about us?",
        "checkoutDisplaySection": "payment_details",
        "cpField": true,
        "options": [
          { "title": "Google", "surcharge": 0 },
          { "title": "Wholesale Central", "surcharge": 0 },
          { "title": "Referral", "surcharge": 0 },
          { "title": "Retailing Insight", "surcharge": 0 },
          { "title": "Other", "surcharge": 0 }
        ],
        "available": true,
        "required": false,
        "orderDetailsDisplaySection": "billing_info",
        "showInInvoice": false,
        "showInNotifications": false,
        "saveToCustomerProfile": false,
        "orderBy": 3
      }
    },
    "removedExtraFieldsKeys": [],
    "extraFieldsPayload": {
      "mapToUpdate": {
        "ecwid_order_pickup_time": {
          "title": "_msg_ShippingDetails.pickup_date_time",
          "type": "DATETIME",
          "required": true,
          "available": false,
          "checkoutDisplaySection": "pickup_details",
          "orderDetailsDisplaySection": "shipping_info"
        },
        "ecwid_order_delivery_time_interval_start": {
          "title": "_msg_ShippingDetails.delivery_date_time",
          "type": "DATETIME",
          "required": true,
          "available": false,
          "checkoutDisplaySection": "shipping_methods",
          "orderDetailsDisplaySection": "shipping_info"
        },
        "3w9kla3": {
          "type": "text",
          "title": "Tax ID",
          "checkoutDisplaySection": "email",
          "cpField": true,
          "textPlaceholder": "Enter your tax identification number",
          "available": true,
          "required": true,
          "orderDetailsDisplaySection": "customer_info",
          "showInInvoice": false,
          "showInNotifications": false,
          "saveToCustomerProfile": false,
          "orderBy": 2
        },
        "bp4q9w3": {
          "type": "select",
          "title": "How did you hear about us?",
          "checkoutDisplaySection": "payment_details",
          "cpField": true,
          "options": [
            { "title": "Google", "surcharge": 0 },
            { "title": "Wholesale Central", "surcharge": 0 },
            { "title": "Referral", "surcharge": 0 },
            { "title": "Retailing Insight", "surcharge": 0 },
            { "title": "Other", "surcharge": 0 }
          ],
          "available": true,
          "required": false,
          "orderDetailsDisplaySection": "billing_info",
          "showInInvoice": false,
          "showInNotifications": false,
          "saveToCustomerProfile": false,
          "orderBy": 3
        }
      },
      "keysToRemove": [],
      "updateMode": "UPDATE_HIDDEN"
    }
  },
  "lang": "en"
}
```

      - Response:

```json
{
  "checkout": {
    "id": "ctYMP1fIyyLsJsMi",
    "identifiers": {
      "abandonedCartId": "6CEFBCCD-895C-412C-A785-E57377172485",
      "internalOrderId": 592049467,
      "orderId": "592049467"
    },
    "payment": {
      "billingPerson": {
        "city": "Alachua",
        "companyName": "Keryx Solutions",
        "countryCode": "US",
        "countryName": "United States",
        "name": "Bala Bosch",
        "phone": "+13522846790",
        "postalCode": "32615",
        "stateOrProvinceCode": "FL",
        "street": "13510 NW 146th Ave"
      }
    },
    "shipping": {
      "fulfillmentType": "SHIPPING",
      "method": "USPS Priority Mail®",
      "person": {
        "city": "Alachua",
        "companyName": "Keryx Solutions",
        "countryCode": "US",
        "countryName": "United States",
        "name": "Bala Bosch",
        "phone": "+13522846790",
        "postalCode": "32615",
        "stateOrProvinceCode": "FL",
        "street": "13510 NW 146th Ave"
      }
    },
    "cartItems": [
      {
        "amounts": {
          "price": 40.0,
          "subtotal": 240.0
        },
        "identifier": {
          "productId": 792668588,
          "selectedOptions": {
            "Stone": {
              "type": "DROPDOWN",
              "choice": "Black Tourmaline"
            }
          }
        },
        "quantity": 6,
        "categoryId": 187249518,
        "options": {
          "Stone": "Black Tourmaline"
        },
        "price": 40.0,
        "productInfo": {
          "description": "Adorn yourself like a graceful goddess in our Dream Goddess Pendant. Your Choice of Protective Rough Black Tourmaline, ...",
          "isBaseProductQuantity": false,
          "mediaItem": {
            "type": "PICTURE",
            "id": "",
            "isMain": true,
            "width": 0,
            "height": 0
          },
          "name": "Dream Goddess Pendant",
          "orderLimits": {},
          "productPrice": 40.0,
          "quantity": 6,
          "sku": "P0512-4",
          "slugs": {
            "forRouteWithId": "Dream-Goddess-Pendant",
            "forRouteWithoutId": "dream-goddess-pendant-792668588"
          }
        },
        "trackingInfo": {
          "contentId": "792668588_230320d0419dbb50bf36ebdadeb89a118cb8e69c",
          "categoryPath": ["Pendants"],
          "brand": "Esprit Creations",
          "externalReferenceId": "41b265cc-22af-452b-ab9d-30cb2f032712"
        },
        "variationId": 487523081,
        "isPreorder": false
      },
      {
        "amounts": {
          "price": 28.0,
          "subtotal": 168.0
        },
        "identifier": {
          "productId": 776698636,
          "selectedOptions": {
            "Shape": {
              "type": "DROPDOWN",
              "choice": "Marquis"
            }
          }
        },
        "quantity": 6,
        "categoryId": 187249518,
        "options": {
          "Shape": "Marquis"
        },
        "price": 28.0,
        "productInfo": {
          "description": "Our Boho Collection is inspired by our passion to honor all life.  Let your light shine with this shimmering, faceted L...",
          "isBaseProductQuantity": false,
          "mediaItem": {
            "type": "PICTURE",
            "id": "",
            "isMain": true,
            "width": 1080,
            "height": 1080,
            "image160pxUrl": "https://d2j6dbq0eux0bg.cloudfront.net/images/121843055/5173799705.jpg",
            "image400pxUrl": "https://d2j6dbq0eux0bg.cloudfront.net/images/121843055/5173799704.jpg",
            "image800pxUrl": "https://d2j6dbq0eux0bg.cloudfront.net/images/121843055/5173799706.jpg"
          },
          "name": "Labradorite Tribal Shine Pendant",
          "orderLimits": {},
          "productPrice": 28.0,
          "quantity": 10,
          "sku": "P0462-1",
          "slugs": {
            "forRouteWithId": "Labradorite-Tribal-Shine-Pendant",
            "forRouteWithoutId": "labradorite-tribal-shine-pendant"
          }
        },
        "trackingInfo": {
          "contentId": "776698636_3eb7f0f350bb2e7ebadd40faf6b4b8e9e3788d99",
          "categoryPath": ["Pendants"],
          "brand": "Esprit Creations",
          "externalReferenceId": "d499bfdc-f156-415f-ad67-d66220a108da"
        },
        "variationId": 475866428,
        "isPreorder": false
      }
    ],
    "customerData": {
      "consents": {
        "isTermsAndConditionsAccepted": false,
        "marketingCommunicationsStatus": "ACCEPTED"
      },
      "loyaltyData": {
        "isEnabled": false,
        "balance": 0.0
      },
      "email": "bala@keryxsolutions.com"
    },
    "discounts": {},
    "amounts": {
      "subtotal": 408.0,
      "subtotalWithoutTax": 408.0,
      "total": 418.45,
      "totalWithoutTax": 418.45,
      "tax": 0.0,
      "couponDiscount": 0.0,
      "volumeDiscount": 0.0,
      "customerGroupDiscount": 0.0,
      "customerGroupVolumeDiscount": 0.0,
      "discount": 0.0,
      "shipping": 10.45,
      "shippingWithoutTax": 10.45,
      "handlingFee": 0.0,
      "handlingFeeWithoutTax": 0.0,
      "isPricesIncludeTax": false
    },
    "summary": {
      "summaryItems": [
        {
          "type": "SUBTOTAL",
          "name": "Subtotal",
          "price": 408.0
        },
        {
          "type": "SHIPPING",
          "name": "Shipping",
          "value": "$10.45",
          "isFreeShipping": false
        },
        {
          "type": "TAX_EXEMPT",
          "message": "Tax exemption"
        }
      ],
      "vatInPriceItems": [],
      "totalTaxes": []
    },
    "extraFields": {
      "3w9kla3": {
        "title": "Tax ID",
        "value": "6543210"
      }
    }
  },
  "checkoutSettings": {
    "checkouts": [
      {
        "type": "GENERAL"
      },
      {
        "type": "STRIPE",
        "ecwidPublishableKey": "pk_live_ASTQDXIRMJCcV3CuJjf7TVdK00zfjOmFw1",
        "country": "US",
        "applePayDomains": [
          "https://linkup.top",
          "espritcreations.company.site"
        ],
        "isAskForShippingForTaxes": true,
        "paymentType": "LS_PAYMENTS",
        "maxTotal": 999999.99,
        "isExpressCheckoutEnabled": true
      }
    ],
    "customerConsents": {
      "marketingCommunications": {
        "isRequired": false,
        "isNewsletterDoubleOptIn": false,
        "text": "Keep me up to date on news and exclusive offers"
      }
    },
    "extraFields": {
      "3w9kla3": {
        "available": true,
        "checkoutDisplaySection": "email",
        "cpField": true,
        "orderBy": 2,
        "orderDetailsDisplaySection": "customer_info",
        "required": true,
        "saveToCustomerProfile": false,
        "showInInvoice": false,
        "showInNotifications": false,
        "textPlaceholder": "Enter your tax identification number",
        "title": "Tax ID",
        "type": "text"
      },
      "bp4q9w3": {
        "available": true,
        "checkoutDisplaySection": "payment_details",
        "cpField": true,
        "options": [
          {
            "title": "Google"
          },
          {
            "title": "Wholesale Central"
          },
          {
            "title": "Referral"
          },
          {
            "title": "Retailing Insight"
          },
          {
            "title": "Other"
          }
        ],
        "orderBy": 3,
        "orderDetailsDisplaySection": "billing_info",
        "required": false,
        "saveToCustomerProfile": false,
        "showInInvoice": false,
        "showInNotifications": false,
        "textPlaceholder": "",
        "title": "How did you hear about us?",
        "type": "select"
      }
    },
    "flags": {
      "canApplyDiscountCoupons": false,
      "canApplyGiftCards": false,
      "canApplyLoyalty": false,
      "hasOnlinePaymentMethod": true,
      "isAskCompanyName": true,
      "isCartPageRelatedProductsEnabled": true,
      "isCheckoutFeatureEnabled": true
    },
    "orderComments": {
      "displayPages": ["checkout-payment"],
      "fieldTitle": "Any special requests on your order?",
      "isRequired": false
    },
    "availableSteps": ["SHIPPING", "PAYMENT", "CONFIRMATION"]
  },
  "notices": [],
  "isNeedToReloadProducts": false,
  "isBillingAddressUpdated": false,
  "isShippingAddressUpdated": false,
  "validation": {
    "notices": []
  }
}
```

2. https://espritcreations.company.site/products/checkout/address

   - name
   - phone
   - mobile phone (optional; custom)
   - company name (optional)
   - address

## Account

1. https://espritcreations.company.site/products/account

   - Edit Name and Email
   - Customer:

```json
{
  "billingPerson": {
    "city": "Alachua",
    "companyName": "Keryx Solutions",
    "countryCode": "US",
    "countryName": "United States",
    "name": "Bala Bosch",
    "phone": "+13522846790",
    "postalCode": "32615",
    "stateOrProvinceCode": "FL",
    "street": "13510 NW 146th Ave"
  },
  "shippingPersons": [
    {
      "city": "alachua",
      "companyName": "DACOMPANY",
      "countryCode": "US",
      "countryName": "United States",
      "postalCode": "fl",
      "stateOrProvinceCode": "FL",
      "street": "13510 nw 146th ave"
    },
    {
      "city": "Alachua",
      "companyName": "Keryx Solutions",
      "countryCode": "US",
      "countryName": "United States",
      "name": "Bala Bosch",
      "phone": "+13522846790",
      "postalCode": "32615",
      "stateOrProvinceCode": "FL",
      "street": "13510 NW 146th Ave"
    }
  ],
  "customerGroup": {
    "id": 25614001,
    "name": "Wholesaler",
    "groupItemDiscounts": []
  },
  "email": "bala@keryxsolutions.com",
  "id": 310808192,
  "name": "Bala Bosch",
  "registrationDate": "2025-07-30T22:41:45Z",
  "isTaxExempt": true,
  "taxId": "",
  "isAcceptedMarketing": true,
  "favoriteProductIds": [776681853]
}
```

    - POST to https://app.ecwid.com/storefront/api/v1/121843055/customer/update
      - Payload:

```json
{
  "updatedCustomer": {
    "name": "Balarama Bosch",
    "email": "bala@keryxsolutions.com"
  },
  "lang": "en"
}
```

      - Response:

```json
{
  "billingPerson": {
    "city": "Alachua",
    "companyName": "Keryx Solutions",
    "countryCode": "US",
    "countryName": "United States",
    "name": "Balarama Bosch",
    "phone": "+13522846790",
    "postalCode": "32615",
    "stateOrProvinceCode": "FL",
    "street": "13510 NW 146th Ave"
  },
  "shippingPersons": [
    {
      "city": "alachua",
      "companyName": "DACOMPANY",
      "countryCode": "US",
      "countryName": "United States",
      "postalCode": "fl",
      "stateOrProvinceCode": "FL",
      "street": "13510 nw 146th ave"
    },
    {
      "city": "Alachua",
      "companyName": "Keryx Solutions",
      "countryCode": "US",
      "countryName": "United States",
      "name": "Bala Bosch",
      "phone": "+13522846790",
      "postalCode": "32615",
      "stateOrProvinceCode": "FL",
      "street": "13510 NW 146th Ave"
    }
  ],
  "customerGroup": {
    "id": 25614001,
    "name": "Wholesaler",
    "groupItemDiscounts": []
  },
  "email": "bala@keryxsolutions.com",
  "id": 310808192,
  "name": "Balarama Bosch",
  "registrationDate": "2025-07-30T22:41:45Z",
  "isTaxExempt": true,
  "taxId": "",
  "isAcceptedMarketing": true,
  "favoriteProductIds": [776681853]
}
```

## Form HTML

- name and phone input (2 inputs on 1 line)

```html
<div class="ec-form__row">
  <div class="ec-form__cell ec-form__cell--8 ec-form__cell-name">
    <label for="ec-full-name"
      ><div class="ec-form__title ec-header-h6">
        <div class="marker-required marker-required--medium"></div>
        First and last name
      </div></label
    >
    <div class="form-control form-control--flexible form-control--type-name">
      <input
        id="ec-full-name"
        class="form-control__text"
        aria-label=""
        maxlength="255"
        autocomplete="shipping name"
        required=""
        autocorrect="off"
        enterkeyhint="next"
        type="text"
        name="name"
      />
      <div class="form-control__placeholder">
        <div class="form-control__placeholder-inner"></div>
      </div>
    </div>
  </div>
  <div class="ec-form__cell ec-form__cell--4 ec-form__cell--phone">
    <label for="ec-phone"
      ><div class="ec-form__title ec-header-h6">
        <div class="marker-required marker-required--medium"></div>
        Phone (optional)
      </div></label
    >
    <div class="form-control form-control--flexible form-control--type-phone">
      <input
        id="ec-phone"
        class="form-control__text"
        aria-label=""
        maxlength="255"
        autocomplete="shipping tel"
        required=""
        autocorrect="off"
        enterkeyhint="next"
        type="text"
        name="phone"
      />
      <div class="form-control__placeholder">
        <div class="form-control__placeholder-inner"></div>
      </div>
    </div>
  </div>
</div>
```

- organization (single input on a line)

```html
<div class="ec-form__row">
  <div class="ec-form__cell ec-form__cell--company-name">
    <label for="ec-organization-name"
      ><div class="ec-form__title ec-header-h6">
        Company name (optional)
      </div></label
    >
    <div class="form-control form-control--flexible form-control--type-company">
      <input
        id="ec-organization-name"
        class="form-control__text"
        aria-label=""
        maxlength="255"
        autocomplete="shipping organization"
        autocorrect="off"
        type="text"
        name="organization"
      />
      <div class="form-control__placeholder">
        <div class="form-control__placeholder-inner"></div>
      </div>
    </div>
  </div>
</div>
```

- submit

```html
<div class="ec-form">
  <div class="ec-form__row ec-form__row--continue">
    <div class="ec-form__cell ec-form__cell--6">
      <div
        class="form-control form-control--button form-control--large form-control--primary form-control--flexible form-control--done "
      >
        <button class="form-control__button" type="button">
          <div class="form-control__loader"></div>
          <span class="form-control__button-text">Continue</span>
        </button>
      </div>
    </div>
  </div>
</div>
```

- form and wrapper

```html
<div>
  <p>
    <span class="ec-cart-step__mandatory-fields-notice"
      >All fields are required unless they’re explicitly marked as
      optional.</span
    >
  </p>
  <form class="ec-form" action onsubmit="return false">...</form>
</div>
```

- email and name edit form (has no form element)

```html
<div class="ec-form">
  <div class="ec-form__row">
    <div class="ec-form__cell">
      <div class="ec-form__title ec-header-h6">Name and email</div>
      <div class="form-control form-control--flexible">
        <!----><input
          class="form-control__text"
          type="text"
          id="ec-name-input"
          name="text"
          aria-label="Your first and last name"
          maxlength="255"
          value="Bala Bosch"
        /><!---->
        <div class="form-control__placeholder">
          <div class="form-control__placeholder-inner">
            Your first and last name
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="ec-form__row">
    <div class="ec-form__cell">
      <div class="form-control form-control--flexible">
        <!----><input
          class="form-control__text"
          type="email"
          id="ec-email-input"
          name="email"
          aria-label="Your email"
          maxlength="255"
          value="bala@keryxsolutions.com"
        /><!---->
        <div class="form-control__placeholder">
          <div class="form-control__placeholder-inner">Your email</div>
        </div>
      </div>
      <div id="ec-email-input-msg" class="form__msg"></div>
    </div>
  </div>
  <div class="ec-form__row">
    <div class="ec-form__cell">
      <div
        class="form-control form-control--button form-control--large form-control--primary form-control--flexible form-control--done"
      >
        <button class="form-control__button" type="button">
          <div class="form-control__loader"></div>
          <!----><span class="form-control__button-text">Save</span
          ><!---->
        </button>
      </div>
    </div>
  </div>
</div>
```

- button.control\_\_button onclick handler
  POST to https://app.ecwid.com/storefront/api/v1/121843055/customer/update
  see vendor.js

```js
function Oh(e, t) {
  const n = (s) => {
    if (!s._vts) s._vts = Date.now();
    else if (s._vts <= n.attached) return;
    lt(Th(s, n.value), t, 5, [s]);
  };
  return (n.value = e), (n.attached = Eh()), n;
}
```

- checkbox element

```html
<div class="ec-cart__agreement">
  <div class="ec-cart__agreement ec-cart__marketing-agreement">
    <div class="form-control--checkbox form-control ">
      <div class="form-control__checkbox-wrap">
        <input
          class="form-control__checkbox"
          type="checkbox"
          name=""
          value=""
          id="form-control__checkbox-accept-marketing"
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
        <label for="form-control__checkbox-accept-marketing"
          >Keep me up to date on news and exclusive offers</label
        >
      </div>
    </div>
  </div>
</div>
```

- tax id

```html
<div class="ec-form ec-form--mb2">
  <div class="ec-form__row ec-form__row--3w9kla3">
    <div class="ec-form__cell ec-form__cell--3w9kla3">
      <div class="ec-form__title ec-header-h6" style="white-space: pre-line;">
        <div class="marker-required marker-required--medium"></div>
        Tax ID
      </div>
      <div class="form-control form-control--flexible">
        <input
          id=""
          class="form-control__text"
          aria-label="Enter your tax identification number"
          maxlength="512"
          type="text"
          name="3w9kla3"
        />
        <div class="form-control__placeholder">
          <div class="form-control__placeholder-inner">
            Enter your tax identification number
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

- alternate onclick handler
  see ecwid-storefront.js

```js
function u(t) {
  var r = u.info,
    e = G(wo.run, r.decoder, t);
  if ("Ok" === e.ctor)
    for (
      var r = r.options,
        o =
          (r.stopPropagation && t.stopPropagation(),
          r.preventDefault && t.preventDefault(),
          e._0),
        c = i;
      c;

    ) {
      var n = c.tagger;
      if ("function" == typeof n) o = n(o);
      else for (var _ = n.length; _--; ) o = n[_](o);
      c = c.parent;
    }
}
```

## Errored field

```html
<div class="ec-form__row">
  <div class="ec-form__cell ec-form__cell--country">
    <label for="ec-country"
      ><div class="ec-form__title ec-header-h6">
        <div
          class="marker-required marker-required--medium marker-required--active"
        ></div>
        Country
      </div></label
    >
    <div
      class="form-control--empty form-control--select form-control--error  form-control form-control--flexible form-control--type-country"
    >
      <input
        class="form-control__text"
        type="text"
        readonly=""
        tabindex="-1"
        aria-label="Country"
        name="Country"
      /><select
        class="form-control__select"
        name="country-list"
        required=""
        aria-label="Country"
        id="ec-country"
        aria-describedby="ec-country-msg"
      >
        <option value="">Please choose</option>
        <option value="US">United States</option>
        <option value="UM">United States Minor Outlying Islands</option>
        <option value="VI">Virgin Islands, U.S.</option>
      </select>
      <div class="form-control__placeholder">
        <div class="form-control__placeholder-inner">
          Please select a country
        </div>
      </div>
      <div class="form-control__arrow">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11 4L6 9 1 4"
            fill="none"
            fill-rule="evenodd"
            stroke="currentColor"
            stroke-width="1"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></path>
        </svg>
      </div>
    </div>
    <div class="form__msg form__msg--error" id="ec-country-msg">
      Please specify your country
    </div>
  </div>
</div>
```

## makeRequest

```js
function I() {
    return window._xnext_initialization_scripts
}
function Qe() {
    return I().some(t => t.widgetType === a.PRODUCT || t.widgetType === a.SINGLE_PRODUCT)
}
function pf() {
    const e = Qe()
      , t = Gt()
      , {sessionToken: o} = eo()
      , n = we()
      , r = Ae();
    return xo({
        mutationKey: [ts],
        mutationFn: async a => {
            n.info(Y.MUTATION, "UpdateCustomerInfoMutation start mutation", a);
            const s = await df(a, r.value, e)
              , i = bt(o);
            return t.setQueryData(i, s),
            n.info(Y.MUTATION, "UpdateCustomerInfoMutation finish mutation", a),
            s
        }
        ,
        onMutate: async a => {
            n.info(Y.MUTATION, "UpdateCustomerInfoMutation onMutate", a);
            const s = bt(o);
            await t.cancelQueries({
                queryKey: s
            });
            const i = t.getQueryData(s);
            return os(t, s, d => ({
                ...d,
                ...a
            })),
            {
                previousCustomer: i
            }
        }
        ,
        onError: (a, s, i) => {
            n.error(Y.MUTATION, "UpdateCustomerInfoMutation onError", a);
            const d = bt(o);
            t.setQueryData(d, i?.previousCustomer)
        }
    })
}
async function df(e, t, o) {
    const n = {
        updatedCustomer: e,
        lang: t
    };
    return o.makeRequest("/customer/update", n).then(r => ({
        type: "authorized",
        customer: r.data
    }))
}
```

```js
Ecwid.ecommerceInstance.widgets.options.storefrontApiClient.makeRequest
```

## App Storage for Customer Extra Fields

Public app storage can expose Customer Extra Fields metadata to the storefront. The app/webhook seeds `scope=public`, `key=extrafields` with the JSON returned by Application Fields (CUSTOMERS).

```javascript
const raw = Ecwid.getAppStorageData("public"); // or Ecwid.getAppStorageData("public", "extrafields")
const extrafields = raw ? JSON.parse(raw) : null;
console.log(extrafields);
```

Expected shape:

```json
{
  "items": [
    { "key": "HWVrQNC", "title": "Tax ID", "entityTypes": ["CUSTOMERS"], "type": "TEXT", "textPlaceholder": "Enter your tax identification number", "required": true },
    { "key": "HSdoOLH", "title": "How did you hear about us?", "entityTypes": ["CUSTOMERS"], "type": "SELECT", "options": [ { "title": "Google" }, { "title": "Referral" } ] },
    { "key": "38BPWmS", "title": "Cell Phone", "entityTypes": ["CUSTOMERS"], "type": "TEXT" }
  ]
}
```

Storefront maps by title (case-insensitive) and prefers keys when present.
