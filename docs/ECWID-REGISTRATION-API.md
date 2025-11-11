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
    "name": string,           // Customer full name
    "companyName": string,    // Company name
    "postalCode": string,     // Postal/ZIP code
    "countryCode": string,    // ISO 3166-1 alpha-2 (e.g., "US")
    "phone": string,          // Business phone (becomes default contact)
    "cellPhone": string,      // Cell phone (secondary contact)
    "taxId": string,          // Tax ID / VAT number
    "hear": string,           // How did you hear about us?
    "acceptMarketing": boolean // Marketing consent
  }
}
```

**Field Mapping**:
- `name` → Customer name, billing name, shipping name
- `companyName` → Billing company, shipping company
- `postalCode`/`countryCode` → Billing and shipping addresses
- `phone` → Billing phone + default business contact
- `cellPhone` → Secondary phone contact
- `taxId` → Customer taxId field + extrafield (if configured)
- `hear` → Extrafield (if configured)
- `acceptMarketing` → Customer acceptMarketing flag

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

#### 400 Bad Request
Invalid request schema or missing required fields.

```json
{
  "errorMessage": "Invalid request schema",
  "errorCode": "E_INVALID_REQUEST"
}
```

#### 401 Unauthorized
Invalid or expired storefront session token.

```json
{
  "errorMessage": "Invalid or expired session",
  "errorCode": "E_STOREFRONT_UNAUTHORIZED"
}
```

#### 403 Forbidden
Origin not in allowlist.

```json
{
  "errorMessage": "Origin not allowed",
  "errorCode": "E_FORBIDDEN_ORIGIN"
}
```

#### 409 Conflict
Idempotency key reused with different request body.

```json
{
  "errorMessage": "Idempotency key conflict",
  "errorCode": "E_IDEMPOTENT_REPLAY"
}
```

#### 429 Too Many Requests
Rate limit exceeded.

**Headers**: `Retry-After: <seconds>`

```json
{
  "errorMessage": "Too many requests",
  "errorCode": "E_RATE_LIMITED"
}
```

Or for store-level limits:

```json
{
  "errorMessage": "Too many requests to store",
  "errorCode": "E_RATE_LIMITED"
}
```

#### 500 Server Error
Customer group not found in store configuration.

```json
{
  "errorMessage": "Required customer group not found",
  "errorCode": "E_GROUP_NOT_FOUND"
}
```

#### 502 Bad Gateway
Upstream Ecwid API failure.

```json
{
  "errorMessage": "Upstream service failure",
  "errorCode": "E_UPSTREAM"
}
```

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

## Security Notes

1. **Never expose REST API tokens client-side** - The server handles all Ecwid REST API calls
2. **Use HTTPS** - All requests must use HTTPS
3. **Validate session tokens** - Tokens expire; handle 401 responses by re-authenticating
4. **Store idempotency keys** - For safe retries on network failures
5. **Respect rate limits** - Implement exponential backoff for 429 responses

## Support

For API issues or integration questions, contact the server administrator or file an issue at the project repository.
