# Explore using public api

## Using REST API

```js
const CLIENT_ID = "custom-app-121843055-1";
const STORE_ID = Ecwid.getOwnerId(); // 121843055
const PUBLIC_TOKEN = Ecwid.getAppPublicToken(CLIENT_ID); // public_NCQq64TdyuEjdXnBmgri4cFArjBYvFnG
const SECRET_TOKEN = "secret_fn6BnQjbBsMAR798PDcHYyHfHbsWzWyD";

// GET https://app.ecwid.com/api/v3/{storeId}/store_extrafields/customers
/* Request:
GET /api/v3/1003/store_extrafields/customers HTTP/1.1
Authorization: Bearer SECRET_TOKEN
Host: app.ecwid.com
*/
/* Response
{
  items: [
    {
      key: "HWVrQNC",
      title: "Tax ID",
      entityTypes: ["CUSTOMERS"],
      type: "TEXT",
      shownOnOrderDetails: false,
      linkedWithCheckoutField: false,
      createdDate: "2025-09-14 17:29:52 +0000",
      lastModifiedDate: "2025-09-14 17:29:52 +0000",
    },
    {
      key: "HSdoOLH",
      title: "How did you hear about us?",
      entityTypes: ["CUSTOMERS"],
      type: "TEXT",
      shownOnOrderDetails: false,
      linkedWithCheckoutField: false,
      createdDate: "2025-09-15 12:42:09 +0000",
      lastModifiedDate: "2025-09-15 12:42:09 +0000",
    },
    {
      key: "38BPWmS",
      title: "Cell phone",
      entityTypes: ["CUSTOMERS"],
      type: "TEXT",
      shownOnOrderDetails: false,
      linkedWithCheckoutField: false,
      createdDate: "2025-10-28 17:31:20 +0000",
      lastModifiedDate: "2025-10-28 17:31:20 +0000",
    },
    {
      key: "Gh22NFp",
      title: "ABCDE",
      entityTypes: ["CUSTOMERS"],
      type: "TEXT",
      shownOnOrderDetails: true,
      linkedWithCheckoutField: false,
      createdDate: "2025-08-14 16:14:17 +0000",
      lastModifiedDate: "2025-08-14 16:14:17 +0000",
    },
    {
      key: "1b3kGob",
      title: "When they are awwesome",
      entityTypes: ["CUSTOMERS"],
      type: "DATETIME",
      shownOnOrderDetails: true,
      linkedWithCheckoutField: false,
      createdDate: "2025-08-14 16:15:59 +0000",
      lastModifiedDate: "2025-08-14 16:15:59 +0000",
    },
  ],
};
*/
```

## Current state

We cannot use public REST api to get extrafields.

Can we have a setup portion when the app is first set up to create a store level settings that can be accessed from public app or storefront js api?
Let's test it using docs on https://docs.ecwid.com/api-reference/rest-api/application/add-app-storage-data
Key: extrafields
Value: The response from ## Using REST API

## Update 1

test_set.sh and test_get.sh scripts are added to test the app storage data and prove we can set public app data.
we have also confirmed that we can get the public app data using storefront js api.

```js
const extrafields = Ecwid.getAppStorageData("public");
console.log(extrafields);
/*
'{ "items": [ { "key": "HWVrQNC", "title": "Tax ID", "entityTypes": ["CUSTOMERS"], "type": "TEXT", "shownOnOrderDetails": false, "linkedWithCheckoutField": false, "createdDate": "2025-09-14 17:29:52 +0000", "lastModifiedDate": "2025-09-14 17:29:52 +0000" }, { "key": "HSdoOLH", "title": "How did you hear about us?", "entityTypes": ["CUSTOMERS"], "type": "TEXT", "shownOnOrderDetails": false, "linkedWithCheckoutField": false, "createdDate": "2025-09-15 12:42:09 +0000", "lastModifiedDate": "2025-09-15 12:42:09 +0000" }, { "key": "38BPWmS", "title": "Cell phone", "entityTypes": ["CUSTOMERS"], "type": "TEXT", "shownOnOrderDetails": false, "linkedWithCheckoutField": false, "createdDate": "2025-10-28 17:31:20 +0000", "lastModifiedDate": "2025-10-28 17:31:20 +0000" }, { "key": "Gh22NFp", "title": "ABCDE", "entityTypes": ["CUSTOMERS"], "type": "TEXT", "shownOnOrderDetails": true, "linkedWithCheckoutField": false, "createdDate": "2025-08-14 16:14:17 +0000", "lastModifiedDate": "2025-08-14 16:14:17 +0000" }, { "key": "1b3kGob", "title": "When they are awwesome", "entityTypes": ["CUSTOMERS"], "type": "DATETIME", "shownOnOrderDetails": true, "linkedWithCheckoutField": false, "createdDate": "2025-08-14 16:15:59 +0000", "lastModifiedDate": "2025-08-14 16:15:59 +0000" } ] }'
*/
```

The key/value pair is stored in app storage data as string/string. So we will need to parse it to json to get the actual data.

```js
const extrafields = JSON.parse(Ecwid.getAppStorageData("public"));
console.log(extrafields);
```

Can we use webhooks to update the app storage data when the extrafields are updated in the store?
How do we set the initial data in the app storage data if there is no webhook trigger?

The webhook server must do the following:

1. Set and maintain the app storage data when the extrafields are updated in the store.
2. Update customers when a customer is created or updated in the store.
   - If customer has all required fields then set add customer to wholesaler group

app.js must be updated to use the app storage data to get the extrafields. Order extrafields ids are different from customer extrafields ids. We want to set the customer extrafields, not the order extrafields with the registration form.
We then need to test that the submitted registration form data is actually stored. At present the form only stores the name and "I would like to receive marketing emails" fields.

When loading the registration form it doesn't yet use the customer value for "I would like to receive marketing emails", but it updates it on submission.

## Update 2

```js
/**
 * Load Customer Extra Field defs with preference for App Storage; fallback to checkout-based discovery.
 */
async function loadCustomerExtraDefsSafe() {
```

This function should not fall back to checkout-based discovery since the ids are going to be different than what we need.

As for getting the data for extrafields in our webhook server, we need to first find the fields using:
https://docs.ecwid.com/api-reference/rest-api/customers/customer-extra-fields/search-customer-extra-fields
Then, to ensure we get the full data for each field, we need to get the data for each field using:
https://docs.ecwid.com/api-reference/rest-api/customers/customer-extra-fields/get-customer-extra-field

## Update 3

My previous assumption about extrafields was wrong. The search endpoint does give us all data we need.
There is however a discrepancy between customer extrafields (text and date only) and checkout extrafields (select, among many others).
We will need to add site-specific custom code to turn it into a select field with correct options.

## Update 4

We can get the session token from storefront js api.

```js
Ecwid.ecommerceInstance.widgets.options.storefrontApiClient
  .sessionStorageOptions.sessionToken._value;
```

We can use the session token to authenticate that the api call is from the user. We won't need to worry about SSO this way.

1. We POST from our registration form to our server with the session token and the registration form data.
2. We use the session token to get the logged in customer using storefront js api.

```bash
curl 'https://app.ecwid.com/storefront/api/v1/121843055/customer' \
  -H 'Accept: */*' \
  -H 'Accept-Language: en-US,en;q=0.9' \
  -H 'Cache-Control: no-cache' \
  -H 'Connection: keep-alive' \
  -H 'Origin: https://espritcreations.company.site' \
  -H 'Pragma: no-cache' \
  -H 'Referer: https://espritcreations.company.site/' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: cross-site' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36' \
  -H 'authorization: Bearer the_session_token' \
  -H 'content-type: application/json' \
  -H 'sec-ch-ua: "Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'traceparent: 00-0000000000000000220c3fce7c00223a-59262324be56fdb0-01' \
  --data-raw '{"lang":"en"}'
```

3. If customer id matches posted registration form data then we know the request is from the user.
4. Use REST API with private key to update all customer registration data and assign customer to wholesaler group.
5. Return success to our registration form.

Customer data we want to set:

```js
{
  name: values.name,
  acceptMarketing: !!values.acceptMarketing,
  billingPerson: {
    name: values.name,
    companyName: values.companyName,
    street: values.street,
    city: values.city,
    countryCode: values.countryCode,
    postalCode: values.postalCode,
    stateOrProvinceCode: values.stateOrProvinceCode,
    phone: values.phone,
  },
  shippingAddresses: [
    {
      name: values.name,
      companyName: values.companyName,
      street: values.street,
      city: values.city,
      countryCode: values.countryCode,
      postalCode: values.postalCode,
      stateOrProvinceCode: values.stateOrProvinceCode,
      phone: values.phone,
    },
  ],
  isAcceptedMarketing: !!values.acceptMarketing,
  taxId: values.taxId,
  // wholesaler group id; need to get it dynamically
  customerGroupId: "25614001",
  contacts: [
    {
      type: "PHONE",
      default: true,
      contact: values.phone,
    },
  ],
}
```

Server cannot be hosted on github as js, because we can't use private key in js.
We don't need to use webhook for this.
We will host it on cloudflare workers.

### Test REST API with private key

command:

```bash
curl -H "Authorization: Bearer secret_fn6BnQjbBsMAR798PDcHYyHfHbsWzWyD" "https://app.ecwid.com/api/v3/121843055/customers/310808192"
```

response:

```json
{
  "id": 310808192,
  "email": "bala@keryxsolutions.com",
  "registered": "2025-07-30 22:41:45 +0000",
  "updated": "2025-11-05 20:54:23 +0000",
  "billingPerson": {
    "name": "Bala Bosch",
    "firstName": "Bala",
    "lastName": "Bosch",
    "companyName": "Keryx Solutions?",
    "street": "13510 NW 146th Ave",
    "city": "Alachua",
    "countryCode": "US",
    "countryName": "United States",
    "postalCode": "32616",
    "stateOrProvinceCode": "FL",
    "stateOrProvinceName": "Florida",
    "phone": "3522846790"
  },
  "shippingAddresses": [
    {
      "id": 241324259,
      "companyName": "Keryx Solutions",
      "street": "13510 NW 146th Ave",
      "city": "Alachua",
      "countryCode": "US",
      "countryName": "United States",
      "postalCode": "32616",
      "stateOrProvinceCode": "FL",
      "stateOrProvinceName": "Florida",
      "createdDate": "2025-11-05 20:54:23 +0000",
      "defaultAddress": true,
      "orderBy": 0,
      "addressFormatted": "Keryx Solutions, 13510 NW 146th Ave, Alachua, Florida 32616, United States"
    }
  ],
  "customerGroupId": 25614001,
  "customerGroupName": "Wholesaler",
  "taxExempt": true,
  "taxId": "",
  "taxIdValid": false,
  "b2b_b2c": "b2c",
  "fiscalCode": "",
  "electronicInvoicePecEmail": "",
  "electronicInvoiceSdiCode": "",
  "acceptMarketing": true,
  "lang": "en",
  "contacts": [
    {
      "id": 216290025,
      "contact": "bala@keryxsolutions.com",
      "type": "EMAIL",
      "default": true,
      "orderBy": 0,
      "timestamp": "2025-07-30 23:41:36 +0000"
    },
    {
      "id": 218353636,
      "contact": "3522846790",
      "type": "PHONE",
      "note": "Cell phone",
      "default": true,
      "orderBy": 1,
      "timestamp": "2025-11-05 20:53:43 +0000"
    },
    {
      "id": 218353636,
      "contact": "3524741774",
      "type": "PHONE",
      "note": "Business phone",
      "default": false,
      "orderBy": 2,
      "timestamp": "2025-11-05 20:53:43 +0000"
    }
  ],
  "stats": {
    "numberOfOrders": 0,
    "numberOfCanceledOrders": 0,
    "salesValue": 0,
    "averageOrderValue": 0,
    "firstOrderDate": "2025-08-23 04:59:06 +0000",
    "lastOrderDate": "2025-08-23 04:59:06 +0000"
  },
  "privateAdminNotes": "",
  "favorites": [
    { "productId": 776681853, "addedTimestamp": "2025-10-27 12:37:19 +0000" }
  ],
  "extrafields": [
    {
      "key": "HWVrQNC",
      "title": "Tax ID",
      "value": "123456",
      "orderBy": 0,
      "type": "TEXT",
      "entityTypes": ["CUSTOMERS"]
    },
    {
      "key": "HSdoOLH",
      "title": "How did you hear about us?",
      "value": "From somewhere",
      "orderBy": 1,
      "type": "TEXT",
      "entityTypes": ["CUSTOMERS"]
    }
  ]
}
```
