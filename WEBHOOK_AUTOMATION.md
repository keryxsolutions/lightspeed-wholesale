# Webhook Automation for Wholesale Registration

## Overview

After a customer submits the wholesale registration form via the storefront, group assignment must be handled server-side through Ecwid Automations or Webhooks. The client-side code does NOT assign customer groups for security reasons.

## Requirements

### Trigger Event
- **Event**: `customer.updated` or `order.updated`
- **Source**: Ecwid Webhook or Automation

### Conditions
The automation should check:
1. Customer has a valid Tax ID in extra fields (key: `3w9kla3` or title: `Tax ID`)
2. Customer is not already assigned to the "Wholesaler" group
3. Tax ID format validation (optional, based on your business requirements)

### Actions

When conditions are met, the automation should:

1. **Assign Customer Group**
   - Add customer to the "Wholesaler" customer group
   - Use Ecwid Admin API: `PUT /customers/{customerId}`
   - Set `membershipId` to the ID of the "Wholesaler" group

2. **Set Tax Exempt Status** (if applicable to your tax policy)
   - Set `taxExempt: true` in customer record
   - Use same API endpoint

3. **Send Confirmation Email** (optional)
   - Notify customer their wholesale account has been approved
   - Include login instructions and wholesale pricing information

## Implementation Options

### Option 1: Ecwid Automations (Recommended for Non-Technical Users)

Configure in Ecwid Control Panel → Settings → Automations:

**Trigger**: When customer profile is updated
**Condition**: Tax ID field is not empty
**Action**: Add customer to "Wholesaler" group

### Option 2: Custom Webhook Handler (Recommended for Developers)

Set up a webhook listener at your server endpoint:

**Webhook URL**: `https://your-server.com/webhooks/ecwid/customer-updated`
**Event Type**: `customer.updated`

**Endpoint Logic**:
```javascript
// Pseudo-code example
async function handleCustomerUpdate(event) {
  const customerId = event.data.customerId;

  // Fetch customer details
  const customer = await ecwidAPI.getCustomer(customerId);

  // Check for Tax ID in extra fields
  const taxId = customer.extraFields?.find(f =>
    f.key === '3w9kla3' || f.title === 'Tax ID'
  )?.value;

  if (!taxId) return; // No Tax ID, skip

  // Check if already wholesaler
  const wholesalerGroup = await ecwidAPI.getCustomerGroup({ name: 'Wholesaler' });
  if (customer.membershipId === wholesalerGroup.id) return; // Already assigned

  // Validate Tax ID (optional - implement your validation logic)
  if (!isValidTaxId(taxId)) {
    await sendRejectionEmail(customer.email);
    return;
  }

  // Assign to Wholesaler group
  await ecwidAPI.updateCustomer(customerId, {
    membershipId: wholesalerGroup.id,
    taxExempt: true // Optional, based on your tax policy
  });

  // Send approval email
  await sendApprovalEmail(customer.email, customer.name);
}
```

### Option 3: Third-Party Integration (Zapier, Make.com, etc.)

Configure a workflow:

**Trigger**: Ecwid → Customer Updated
**Filter**: Tax ID field is not empty
**Action**: Ecwid → Update Customer → Set Customer Group to "Wholesaler"

## API Endpoints Needed

### Get Customer
```
GET https://app.ecwid.com/api/v3/{storeId}/customers/{customerId}
Authorization: Bearer {secret_token}
```

### Get Customer Groups
```
GET https://app.ecwid.com/api/v3/{storeId}/customer_groups
Authorization: Bearer {secret_token}
```

### Update Customer
```
PUT https://app.ecwid.com/api/v3/{storeId}/customers/{customerId}
Authorization: Bearer {secret_token}
Content-Type: application/json

{
  "membershipId": 123456,
  "taxExempt": true
}
```

## Required Permissions

Your Ecwid app or webhook must have these scopes:
- `read_customers`
- `update_customers`
- `read_customer_groups`

## Testing the Automation

1. Create a test customer account
2. Submit wholesale registration with valid Tax ID
3. Verify webhook/automation triggers
4. Check customer is assigned to "Wholesaler" group
5. Verify price visibility changes on storefront (prices should now be visible)

## Monitoring & Error Handling

- Log all webhook events for audit trail
- Implement retry logic for failed API calls
- Send admin notifications for validation failures
- Track success/failure metrics

## Security Considerations

- Validate webhook signature from Ecwid to prevent spoofing
- Use HTTPS endpoints only
- Store API tokens securely (environment variables, secrets manager)
- Implement rate limiting on webhook endpoint
- Never expose admin API tokens on the storefront

## Fallback Manual Process

If automation fails:
1. Admin receives notification of new wholesale registration
2. Admin manually reviews Tax ID in Ecwid Control Panel
3. Admin assigns customer to "Wholesaler" group manually
4. Admin notifies customer of approval

## References

- [Ecwid Webhooks Documentation](https://api-docs.ecwid.com/reference/webhooks-overview)
- [Ecwid Customer API](https://api-docs.ecwid.com/reference/customers)
- [Ecwid Customer Groups API](https://api-docs.ecwid.com/reference/customer-groups)
- [Ecwid Automations](https://support.ecwid.com/hc/en-us/articles/360000234556-Automations)
