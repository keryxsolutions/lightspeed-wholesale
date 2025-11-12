# API Reference

Client developer guide for integrating with the Ecwid Registration Server.

## Endpoint Overview

**Base URL**: `https://ecwid-registration.keryx-solutions.workers.dev`

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/register` | POST | Register/update wholesale customer | Storefront session token |
| `/api/register` | OPTIONS | CORS preflight | None |

## POST /api/register

Submit customer registration data from an Ecwid storefront.

### Authentication

Use the Ecwid Storefront API session token obtained after customer login:

```javascript
// Get session token from Ecwid storefront
const token = await Ecwid.Storefront.getSessionToken();
```

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer <storefront_session_token>` |
| `Content-Type` | Yes | `application/json` |
| `Idempotency-Key` | Yes | Unique key for request deduplication (e.g., UUID) |
| `Origin` | Yes | Your storefront origin (must be allowlisted) |

### Request Body

```typescript
{
  "storeId": string,    // Ecwid store ID
  "lang": string,       // Optional, language code (e.g., "en")
  "values": {
    "name": string,                  // Customer full name
    "companyName": string,           // Company name
    "postalCode": string,            // Postal/ZIP code
    "countryCode": string,           // ISO 3166-1 alpha-2 (e.g., "US")
    "street": string,                // Street address (optional, for full address)
    "city": string,                  // City (optional, for full address)
    "stateOrProvinceCode": string,   // State/province code (optional, e.g., "CA")
    "stateOrProvinceName": string,   // State/province name (optional, e.g., "California")
    "phone": string,                 // Business phone (becomes default contact)
    "cellPhone": string,             // Cell phone (secondary contact)
    "taxId": string,                 // Tax ID / VAT number
    "hear": string,                  // How did you hear about us?
    "acceptMarketing": boolean       // Marketing consent
  }
}
```

**All fields in `values` are optional.**

**Field Mapping**:
- `name` → Customer name, billing name, shipping name
- `companyName` → Billing company, shipping company
- `postalCode`/`countryCode` → Billing and shipping addresses
- `street` → Shipping address street (NEW: for full address)
- `city` → Shipping address city (NEW: for full address)
- `stateOrProvinceCode` → Shipping address state code (NEW: for full address)
- `stateOrProvinceName` → Shipping address state name (NEW: alternative to code)
- `phone` → Billing phone + default business contact
- `cellPhone` → Secondary phone contact
- `taxId` → Customer taxId field + extrafield (if configured)
- `hear` → Extrafield (if configured)
- `acceptMarketing` → Customer acceptMarketing flag

### Shipping address behavior (partial vs full)

Ecwid persists shippingAddresses even when only a subset of fields is provided, but the Admin UI only surfaces addresses that include full location details.

- Partial address (may not appear in Admin UI): name/company + postalCode + countryCode. GET shows minimal address and often `defaultAddress: false`, `orderBy: -1` and `addressFormatted` without street/city/state.
- Full address (visible in Admin UI): include street, city, and stateOrProvinceCode (or stateOrProvinceName) along with postalCode and countryCode. GET shows full `addressFormatted`; Admin UI displays it. Default status is managed by Ecwid; sending `defaultAddress` is not guaranteed to be honored.

Direct REST examples (replace placeholders):

```bash
# Partial (stored, often not visible in Admin UI)
curl -i -X PUT \
  "https://app.ecwid.com/api/v3/${STORE_ID}/customers/${CUSTOMER_ID}" \
  -H "Authorization: Bearer ${SECRET_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddresses": [
      { "name": "Test User", "companyName": "Acme Inc", "postalCode": "73301", "countryCode": "US" }
    ]
  }'

curl -s \
  "https://app.ecwid.com/api/v3/${STORE_ID}/customers/${CUSTOMER_ID}?responseFields=shippingAddresses" \
  -H "Authorization: Bearer ${SECRET_TOKEN}" | jq
```

```bash
# Full (visible in Admin UI)
curl -i -X PUT \
  "https://app.ecwid.com/api/v3/${STORE_ID}/customers/${CUSTOMER_ID}" \
  -H "Authorization: Bearer ${SECRET_TOKEN}" \
  -H "Content-Type: application/json" \
  --data-binary @- <<JSON
{
  "shippingAddresses": [
    {
      "name": "Test User",
      "companyName": "Acme Inc",
      "street": "12345 NW 123th Ave",
      "city": "Alachua",
      "postalCode": "32615",
      "countryCode": "US",
      "stateOrProvinceCode": "FL"
    }
  ]
}
JSON

curl -s \
  "https://app.ecwid.com/api/v3/${STORE_ID}/customers/${CUSTOMER_ID}?responseFields=shippingAddresses" \
  -H "Authorization: Bearer ${SECRET_TOKEN}" | jq
```

Notes:

- Our /api/register endpoint continues to require only the existing minimal fields. If the client can provide street/city/state, the server will map them when available to help the address appear in Admin UI.
- Updating an existing address can be done by including its `id` in the shippingAddresses object; otherwise a new address entry is created.

**Server-Controlled**:
- `customerGroupId` → Resolved server-side to wholesale group (not client-settable)

### Success Response

**Status**: `200 OK`

```json
{
  "status": "updated",
  "customerId": 123456,
  "groupId": 25614001
}
```

### Error Responses

All error responses follow a consistent JSON format:
```json
{
  "errorMessage": "Human-readable error description",
  "errorCode": "MACHINE_READABLE_CODE"
}
```

#### 400 Bad Request

Invalid request schema, missing required fields, or malformed JSON.

**Possible error codes**:

**`E_INVALID_REQUEST`** - Invalid request schema or missing required fields
```json
{
  "errorMessage": "Invalid request schema",
  "errorCode": "E_INVALID_REQUEST"
}
```

**`E_INVALID_JSON`** - Malformed JSON in request body
```json
{
  "errorMessage": "Malformed JSON in request body",
  "errorCode": "E_INVALID_JSON"
}
```

**Common causes**:
- Missing `storeId` field
- Missing `Idempotency-Key` header
- Invalid field types in `values` object
- Malformed JSON syntax

#### 401 Unauthorized

**Error code**: `E_STOREFRONT_UNAUTHORIZED`

Storefront session verification failed. This error covers all authentication failures:

```json
{
  "errorMessage": "Invalid or expired session",
  "errorCode": "E_STOREFRONT_UNAUTHORIZED"
}
```

**When this occurs**:
- Invalid or expired session token
- Session token not associated with logged-in customer
- Storefront API returns 4xx error (except 408, 429)
- Includes: 400, 401, 403, 404, 410, 422 from Storefront API

**Client action**: Obtain a fresh session token or prompt the user to log in.

#### 403 Forbidden

**Error code**: `E_FORBIDDEN_ORIGIN`

Request origin not in server allowlist (CORS violation).

```json
{
  "errorMessage": "Origin not allowed",
  "errorCode": "E_FORBIDDEN_ORIGIN"
}
```

**Client action**: Verify the request is being made from an allowed storefront domain. Contact the administrator to add your origin to the allowlist.

#### 409 Conflict

**Error code**: `E_IDEMPOTENT_REPLAY`

Idempotency key reused with different request body.

```json
{
  "errorMessage": "Idempotency key conflict",
  "errorCode": "E_IDEMPOTENT_REPLAY"
}
```

**Client action**: Generate a new unique idempotency key, or retry with the original key if the request body is identical.

#### 429 Too Many Requests

**Error code**: `E_RATE_LIMITED`

Rate limit exceeded (IP-based, token-based, or store-level).

**Headers**: `Retry-After: <seconds>`

**Per IP/Token limits**:
```json
{
  "errorMessage": "Too many requests",
  "errorCode": "E_RATE_LIMITED"
}
```

**Store-level limits**:
```json
{
  "errorMessage": "Too many requests to store",
  "errorCode": "E_RATE_LIMITED"
}
```

**Client action**: Wait for the duration specified in `Retry-After` header before retrying. Implement exponential backoff for subsequent retries.

#### 500 Internal Server Error

**Possible error codes**:

**`E_SERVER_CONFIG`** - Server misconfiguration
```json
{
  "errorMessage": "Store secret_token not configured",
  "errorCode": "E_SERVER_CONFIG"
}
```

**`E_GROUP_NOT_FOUND`** - Required customer group not found
```json
{
  "errorMessage": "Required customer group not found",
  "errorCode": "E_GROUP_NOT_FOUND"
}
```

**Client action**: Contact support. These errors require server-side configuration changes.

#### 502 Bad Gateway

**Error code**: `E_UPSTREAM`

Upstream Ecwid API failure or degradation. This is a temporary infrastructure issue.

```json
{
  "errorMessage": "Upstream service failure",
  "errorCode": "E_UPSTREAM"
}
```

**When this occurs**:
- **Storefront API issues**:
  - 5xx server errors (500, 502, 503, 504)
  - Network timeouts (status 0)
  - 408 Request Timeout
  - 429 Rate Limit (upstream capacity issue)
- **REST API issues**:
  - 5xx server errors
  - Network failures or timeouts
- **Customer Groups API issues**:
  - 4xx/5xx errors (except "Group not found" logical error)

**Client action**: Retry with exponential backoff. These are temporary infrastructure/capacity problems that typically resolve quickly.

### Idempotency Behavior

The `Idempotency-Key` header enables safe retries:

**In-Flight Request** (age < 10s):
- **Status**: `202 Accepted`
- **Headers**: `Retry-After: 2`
- **Body**: Empty
- **Action**: Wait 2 seconds and retry with same key

**Completed Request** (within 24h):
- **Status**: `200 OK` (or original status)
- **Body**: Cached response from first request
- **Action**: Use cached result

**Conflict** (same key, different body):
- **Status**: `409 Conflict`
- **Action**: Generate new idempotency key

## OPTIONS /api/register

CORS preflight request.

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Origin` | Yes | Your storefront origin |

### Success Response (Valid Origin)

**Status**: `204 No Content`

**Headers**:
```
Access-Control-Allow-Origin: <your-origin>
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, Idempotency-Key
Access-Control-Max-Age: 600
Vary: Origin
```

### Forbidden Response (Invalid Origin)

**Status**: `403 Forbidden`

**Headers**:
```
Vary: Origin
```

No `Access-Control-Allow-*` headers are returned (security: prevents mixed signals).

## Rate Limits

Three-tier rate limiting:

**Per IP**:
- 60 requests/minute
- 600 requests/hour

**Per Session Token**:
- 20 requests/minute
- 200 requests/hour

**Per Store (Ecwid REST API)**:
- 500 requests/minute
- 30,000 requests/hour
- Protects against hitting Ecwid's 600 req/min limit (each registration makes ~4 REST calls)
- Error message: "Too many requests to store"

When rate limited:
- Response includes `Retry-After` header (1-600 seconds)
- Wait the specified time before retrying
- 429 errors may come from IP/token tier OR store-level budget exhaustion

## Integration Example

```javascript
// Ecwid storefront page code
async function registerWholesale(formData) {
  // Get session token from Ecwid
  const token = await Ecwid.Storefront.getSessionToken();

  // Generate idempotency key (store for retries)
  const idempotencyKey = crypto.randomUUID();

  try {
    const response = await fetch(
      'https://ecwid-registration.keryx-solutions.workers.dev/api/register',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          storeId: Ecwid.getAppPublicConfig('YOUR_STORE_ID'),
          values: {
            name: formData.name,
            companyName: formData.company,
            postalCode: formData.zip,
            countryCode: formData.country,
            phone: formData.phone,
            cellPhone: formData.cell,
            taxId: formData.taxId,
            hear: formData.referralSource,
            acceptMarketing: formData.newsletter
          }
        })
      }
    );

    if (response.status === 202) {
      // In-flight duplicate, wait and retry
      const retryAfter = response.headers.get('Retry-After');
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      return registerWholesale(formData); // Retry with same idempotency key
    }

    if (response.status === 429) {
      // Rate limited
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`Rate limited. Retry in ${retryAfter} seconds.`);
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errorMessage || 'Registration failed');
    }

    const result = await response.json();
    console.log('Registration successful:', result);
    return result;

  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}
```

## CORS Configuration

Your storefront origin must be added to the server's `ORIGIN_ALLOWLIST`:

```toml
# wrangler.toml
ORIGIN_ALLOWLIST = "https://yourdomain.com,https://yourdomain.company.site"
```

Contact the server administrator to add your origin.

## Public App Config (App Storage)

The server publishes a minimal "public" config to Ecwid App Storage when extrafield keys change, enabling storefronts to reference extrafield keys by title reliably without making additional REST calls or exposing secrets.

### Purpose

- Storefront needs stable extrafield keys to map form fields correctly
- Cannot call REST API from client (would expose `secret_token`)
- Server syncs public config automatically after resolving extrafield keys

### Storage Details

**Storage key**: `public`

**Data format**: Raw JSON object:

```json
{
  "version": 2,
  "updatedAt": "2025-11-11T23:00:00.000Z",
  "hash": "c1f4d2d8e6c9...",
  "extraFields": [
    {
      "key": "HWVrQNC",
      "title": "Tax ID",
      "placeholder": "Enter tax id",
      "type": "text",
      "required": false,
      "options": null
    }
  ]
}
```

### Client Access

Canonical (recommended): App Public Config
```javascript
// Read public config published by the server
const raw = Ecwid.getAppPublicConfig('custom-app-121843055-1');
const config = raw ? JSON.parse(raw) : null;
const extraFields = config?.extraFields || [];
```

Legacy alternatives (when needed):
- REST: `GET https://app.ecwid.com/api/v3/${storeId}/storage/public` with `Authorization: Bearer ${publicToken}`
  ```javascript
  const response = await fetch(
    `https://app.ecwid.com/api/v3/${storeId}/storage/public`,
    { headers: { Authorization: `Bearer ${publicToken}` } }
  );
  const config = await response.json();
  const extraFields = config.extraFields;
  ```
- SDK (if exposed): `Ecwid.getAppStorage('public')`
  ```javascript
  const config = await Ecwid.getAppStorage('public');
  const extraFields = config.extraFields;
  ```

### Usage Example

Map form fields using the published extrafield keys:

```javascript
// Fetch the public config
const config = await getPublicAppConfig(storeId);
const extraFieldMap = config.extraFields.reduce(
  (acc, field) => ({ ...acc, [field.title]: field.key }),
  {}
);

// Use keys in registration
const taxIdKey = extraFieldMap['Tax ID'];
const hearKey = extraFieldMap['How did you hear about us?'];
```

### Important Notes

- App Storage is written by the **server** using the store's `secret_token`
- Do **not** attempt to write it from the client
- Config is updated automatically when extrafield definitions change (best-effort, non-blocking)
  - Read using `public_token` or via Ecwid SDK (no secrets required)
  - Data is stored as a raw JSON object (not stringified)
  - Config is versioned; current version is 2
  - Each `extraField` includes typed metadata (`type`, `required`, `placeholder`, `options`)
  - Warmup/cron also publish the v2 public config (hash-based no-op when unchanged) and will overwrite legacy v1 shape if present

## Security Notes

1. **Never expose REST API tokens client-side** - The server handles all Ecwid REST API calls
2. **Use HTTPS** - All requests must use HTTPS
3. **Validate session tokens** - Tokens expire; handle 401 responses by re-authenticating
4. **Store idempotency keys** - For safe retries on network failures
5. **Respect rate limits** - Implement exponential backoff for 429 responses

## Support

For API issues or integration questions, contact the server administrator or file an issue at the project repository.
