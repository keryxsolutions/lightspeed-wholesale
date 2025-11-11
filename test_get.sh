#!/bin/bash
#
# Ecwid API: Get Specific App Storage Data
# GET https://app.ecwid.com/api/v3/{storeId}/storage/{key}
#
# This script retrieves private app storage data using the secret token.

# -----------------------------------------------------------------------------
# 1. Configuration (Use the same variables as the POST script)
# -----------------------------------------------------------------------------
STORE_ID="121843055"
SECRET_TOKEN="secret_fn6BnQjbBsMAR798PDcHYyHfHbsWzWyD"
APP_STORAGE_KEY="public" # The key to save your data under

# -----------------------------------------------------------------------------
# 2. The cURL Command
# -----------------------------------------------------------------------------
echo "Attempting to GET public data from Ecwid App Storage (using secret token)..."
echo "URL: https://app.ecwid.com/api/v3/${STORE_ID}/storage/${APP_STORAGE_KEY}"
echo "----------------------------------------------------------------------"

curl -X GET \
  "https://app.ecwid.com/api/v3/${STORE_ID}/storage/${APP_STORAGE_KEY}" \
  -H "Authorization: Bearer ${SECRET_TOKEN}"

echo ""
echo "----------------------------------------------------------------------"
echo "GET request sent. The response body contains: {\"key\": \"...\", \"value\": \"...\"}"