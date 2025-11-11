#!/bin/bash
#
# Ecwid API: Add App Storage Data
# POST https://app.ecwid.com/api/v3/{storeId}/storage/{key}
#
# This script uses environment variables and carefully formats the complex JSON
# data to be saved as a string under the 'value' key in the request body.

# -----------------------------------------------------------------------------
# 1. Configuration (Set these environment variables)
# -----------------------------------------------------------------------------
STORE_ID="121843055"
SECRET_TOKEN="secret_fn6BnQjbBsMAR798PDcHYyHfHbsWzWyD"
APP_STORAGE_KEY="public" # Using the reserved 'public' key for storefront access

# -----------------------------------------------------------------------------
# 2. Define Target Fields
# -----------------------------------------------------------------------------
# The titles of the extra fields we want to retrieve and save.
TARGET_TITLES_JSON='["Tax ID", "How did you hear about us?", "Cell phone"]'

# -----------------------------------------------------------------------------
# 3. Fetch and Filter Customer Extra Fields (using curl and jq)
# -----------------------------------------------------------------------------
echo "Step 1: Retrieving all Customer Extra Fields from Ecwid..."

# 3a. Retrieve all customer extra fields
# Endpoint: GET /v3/{storeId}/store_extrafields/customers
FIELDS_RESPONSE=$(curl -s -X GET \
  "https://app.ecwid.com/api/v3/${STORE_ID}/store_extrafields/customers" \
  -H "Authorization: Bearer ${SECRET_TOKEN}")

# Basic error check for API response
if echo "$FIELDS_RESPONSE" | grep -q "errorCode"; then
  echo "ERROR: Failed to retrieve extra fields. Check SECRET_TOKEN and STORE_ID." >&2
  echo "API Response: $FIELDS_RESPONSE" >&2
  exit 1
fi

# 3b. Use jq to filter the items array and format the result.
# The filter selects items whose 'title' is in the TARGET_TITLES_JSON array,
# and wraps the resulting array in a top-level object: { "items": [...] }.
RAW_VALUE_JSON=$(echo "$FIELDS_RESPONSE" | jq \
  --compact-output -c \
  --argjson titles "$TARGET_TITLES_JSON" \
  '{extraFields: (.items | map(select(.title | IN($titles[]))))}')

# Check if jq successfully returned data (or if the required fields were missing)
if [ -z "$RAW_VALUE_JSON" ] || [ "$RAW_VALUE_JSON" = "{}" ]; then
  echo "WARNING: Could not find any of the specified extra fields. Saving empty data."
  RAW_VALUE_JSON='{"extraFields": []}'
fi

echo "Step 2: Successfully filtered the required fields."
echo "Data to be saved (RAW_VALUE_JSON): $RAW_VALUE_JSON"

# -----------------------------------------------------------------------------
# 4. Construct the Final Request Body ({"value": {...}})
# -----------------------------------------------------------------------------
# Use jq to safely build the final payload.
# We use --argjson to pass $RAW_VALUE_JSON as a native JSON object
# for the "value" key, not as a string.
#
# This correctly creates: {"value": {"items":[...]} }
JSON_PAYLOAD=$(jq -n --argjson v "$RAW_VALUE_JSON" '$v')

# Strip all whitespace (spaces, line breaks, etc.) from the JSON payload that isn't part of a string value
JSON_PAYLOAD=$(echo "$JSON_PAYLOAD" | jq -c .)

# -----------------------------------------------------------------------------
# 5. The cURL Command to POST to App Storage
# -----------------------------------------------------------------------------
echo "Step 3: Attempting to POST data to Ecwid App Storage..."
echo "URL: https://app.ecwid.com/api/v3/${STORE_ID}/storage/${APP_STORAGE_KEY}"
echo "----------------------------------------------------------------------"

curl -X POST \
  "https://app.ecwid.com/api/v3/${STORE_ID}/storage/${APP_STORAGE_KEY}" \
  -H "Authorization: Bearer ${SECRET_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD"

echo ""
echo "----------------------------------------------------------------------"
echo "POST request sent. Check the output above for the 'success' field. Run the JS script to retrieve the data."
