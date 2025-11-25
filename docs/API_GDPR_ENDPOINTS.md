# GDPR API Endpoints Documentation

This document describes all GDPR-related API endpoints for managing user data rights in compliance with GDPR (EU 2016/679) and Ukrainian Law No. 2297-VI.

## Overview

All endpoints implement the following user rights:
- ✅ **Right to Access** (GDPR Article 15, Ukrainian Law Article 19)
- ✅ **Right to Rectification** (GDPR Article 16, Ukrainian Law Article 20)
- ✅ **Right to Erasure** (GDPR Article 17, Ukrainian Law Article 21)
- ✅ **Consent Management** (GDPR Article 7, Ukrainian Law Article 12)

---

## 1. Consent Management

### `POST /api/gdpr/consent`

Records or updates user cookie and data processing consents.

#### Request Body

```json
{
  "email": "user@example.com",
  "consents": [
    { "type": "cookies", "granted": true },
    { "type": "analytics", "granted": true },
    { "type": "marketing", "granted": false },
    { "type": "data_processing", "granted": true },
    { "type": "third_party", "granted": false }
  ],
  "version": "1.0"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Consents recorded successfully",
  "recordedConsents": 5
}
```

#### Error Responses

- **400 Bad Request**: Missing required fields or invalid format
- **500 Internal Server Error**: Database error

#### Example Usage

```typescript
const response = await fetch('/api/gdpr/consent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    consents: [
      { type: 'analytics', granted: true },
      { type: 'marketing', granted: false },
    ],
    version: '1.0',
  }),
});

const data = await response.json();
console.log(data); // { success: true, recordedConsents: 2 }
```

---

## 2. Data Export (Right to Access)

### `GET /api/gdpr/export`

Exports all user data in JSON or CSV format.

#### Query Parameters

- `email` (required): User's email address
- `format` (optional): 'json' or 'csv' (default: 'json')

#### Response (200 OK)

Returns a downloadable file with headers:
- `Content-Type`: `application/json` or `text/csv`
- `Content-Disposition`: `attachment; filename="user-data-{email}-{timestamp}.{ext}"`

#### Example Data (JSON)

```json
{
  "personalInfo": {
    "email": "user@example.com",
    "name": "Іван",
    "surname": "Петренко",
    "phone": "+380501234567",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-11-20T14:22:00Z"
  },
  "orders": [
    {
      "order_number": "ORD-001",
      "total_amount": "15000.00",
      "payment_status": "paid",
      "order_status": "delivered",
      "created_at": "2024-10-15T12:00:00Z",
      "items": [...]
    }
  ],
  "cartItems": [...],
  "consents": [
    {
      "consent_type": "analytics",
      "granted": true,
      "granted_at": "2024-11-01T09:00:00Z",
      "version": "1.0"
    }
  ],
  "privacyPolicyAcceptances": [...],
  "sessions": [...]
}
```

#### Example Usage

```typescript
// Download user data as JSON
window.location.href = `/api/gdpr/export?email=${encodeURIComponent('user@example.com')}&format=json`;

// Or using fetch for programmatic access
const response = await fetch(`/api/gdpr/export?email=${encodeURIComponent('user@example.com')}`);
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `user-data-${Date.now()}.json`;
a.click();
```

### `POST /api/gdpr/export`

Alternative method for authenticated data export requests.

#### Request Body

```json
{
  "email": "user@example.com",
  "format": "json"
}
```

#### Response

Same as GET method - returns downloadable file.

---

## 3. Data Deletion (Right to Erasure)

### `POST /api/gdpr/deletion`

Schedules a data deletion request with a 30-day grace period (no email verification required).

#### Request Body

```json
{
  "email": "user@example.com",
  "scheduledDate": "2024-12-25T00:00:00Z",
  "options": {
    "keepOrderHistory": true,
    "keepTransactionRecords": true,
    "anonymizeInsteadOfDelete": false
  }
}
```

#### Fields

- `email` (required): User's email address
- `scheduledDate` (optional): When to execute deletion (default: 30 days from now)
- `options` (optional):
  - `keepOrderHistory`: Keep order records (anonymized) for legal/accounting (default: false)
  - `keepTransactionRecords`: Retain transaction data for financial compliance (default: false)
  - `anonymizeInsteadOfDelete`: Anonymize instead of deleting (default: false)

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Data deletion request scheduled successfully",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "scheduledFor": "2024-12-25T00:00:00.000Z",
  "gracePeriodDays": 30
}
```

#### Error Responses

- **400 Bad Request**: Missing email or invalid scheduled date
- **500 Internal Server Error**: Database error

#### Example Usage

```typescript
// Schedule deletion for 30 days from now (default)
const response = await fetch('/api/gdpr/deletion', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
  }),
});

const data = await response.json();
console.log(data.requestId); // Save this for cancellation
```

### `DELETE /api/gdpr/deletion`

Cancels a scheduled deletion request during the grace period.

#### Query Parameters

- `email` (required): User's email address
- `requestId` (required): Deletion request ID (from POST response)

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Data deletion request cancelled successfully",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Error Responses

- **400 Bad Request**: Missing email or requestId
- **404 Not Found**: Request not found or already processed
- **500 Internal Server Error**: Database error

#### Example Usage

```typescript
const response = await fetch(`/api/gdpr/deletion?email=${encodeURIComponent('user@example.com')}&requestId=${requestId}`, {
  method: 'DELETE',
});

const data = await response.json();
console.log(data); // { success: true, ... }
```

---

## 4. Data Rectification (Right to Correct)

### `GET /api/gdpr/rectification`

Retrieves current user data for review before rectification.

#### Query Parameters

- `email` (required): User's email address

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "name": "Іван",
    "surname": "Петренко",
    "phone": "+380501234567",
    "email": "user@example.com",
    "delivery_address": "вул. Хрещатик, 1",
    "delivery_city": "Київ",
    "delivery_street": "Хрещатик",
    "delivery_building": "1",
    "delivery_apartment": "10",
    "delivery_postal_code": "01001"
  }
}
```

#### Error Responses

- **400 Bad Request**: Missing email parameter
- **404 Not Found**: No data found for this email
- **500 Internal Server Error**: Database error

#### Example Usage

```typescript
const response = await fetch(`/api/gdpr/rectification?email=${encodeURIComponent('user@example.com')}`);
const data = await response.json();
console.log(data.data); // Current user data
```

### `PUT /api/gdpr/rectification`

Updates user personal data (Right to Rectification - Article 20).

**⚠️ Important**: Must respond within 30 calendar days according to Ukrainian Law.

#### Request Body

```json
{
  "email": "user@example.com",
  "updates": {
    "name": "Олександр",
    "surname": "Іваненко",
    "phone": "+380671234567",
    "delivery_city": "Львів",
    "delivery_street": "Шевченка",
    "delivery_building": "25",
    "delivery_apartment": "5",
    "delivery_postal_code": "79000"
  }
}
```

#### Allowed Update Fields

- `name`: User's first name
- `surname`: User's last name
- `phone`: Phone number
- `delivery_address`: Full delivery address
- `delivery_city`: City
- `delivery_street`: Street name
- `delivery_building`: Building number
- `delivery_apartment`: Apartment number
- `delivery_postal_code`: Postal code

#### Response (200 OK)

```json
{
  "success": true,
  "message": "User data updated successfully",
  "updatedFields": ["name", "surname", "phone", "delivery_city"],
  "updatedCount": 4
}
```

#### Error Responses

- **400 Bad Request**: Missing email, no valid fields provided
- **404 Not Found**: No existing data for this email
- **500 Internal Server Error**: Database error

#### Example Usage

```typescript
// Update user phone and address
const response = await fetch('/api/gdpr/rectification', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    updates: {
      phone: '+380671234567',
      delivery_city: 'Львів',
    },
  }),
});

const data = await response.json();
console.log(data.updatedFields); // ["phone", "delivery_city"]
```

### `POST /api/gdpr/rectification`

Alternative method with same functionality as PUT (for form submissions).

---

## Security Considerations

### 1. Authentication

**⚠️ IMPORTANT**: These endpoints currently do NOT require authentication. You should implement authentication before deploying to production:

```typescript
// Example: Add authentication middleware
import { auth } from '@/app/lib/auth';

export async function PUT(request: NextRequest) {
  // Verify user is authenticated and owns the email
  const session = await auth(request);
  if (!session || session.email !== body.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ... rest of handler
}
```

### 2. Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
import { rateLimit } from '@/app/lib/rate-limit';

export async function POST(request: NextRequest) {
  const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
  });

  await limiter.check(request, 10, 'GDPR_CACHE_TOKEN');

  // ... rest of handler
}
```

### 3. Audit Logging

All GDPR operations are automatically logged to the `gdpr_audit_log` table with:
- User email
- Action type
- IP address (from headers)
- User agent
- Timestamp
- Action details

### 4. Data Validation

Always validate:
- Email format
- Required fields
- Data types
- Field lengths
- SQL injection prevention (using parameterized queries)

---

## Compliance Timeline

According to Ukrainian Law No. 2297-VI:

| Right | Response Deadline |
|-------|-------------------|
| Right to Access (Export) | 30 calendar days |
| Right to Rectification | 30 calendar days |
| Right to Erasure | 30 calendar days + grace period |
| Consent Management | Immediate |

---

## Integration Examples

### Example 1: User Privacy Portal

```typescript
// components/PrivacyPortal.tsx
'use client';

import { useState } from 'react';

export default function PrivacyPortal({ userEmail }: { userEmail: string }) {
  const [loading, setLoading] = useState(false);

  const handleExportData = async () => {
    setLoading(true);
    try {
      window.location.href = `/api/gdpr/export?email=${encodeURIComponent(userEmail)}&format=json`;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure? This action cannot be undone after 30 days.')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/gdpr/deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();
      alert(`Deletion scheduled for ${new Date(data.scheduledFor).toLocaleDateString()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Your Privacy Rights</h2>
      <button onClick={handleExportData} disabled={loading}>
        Export My Data
      </button>
      <button onClick={handleDeleteAccount} disabled={loading}>
        Delete My Account
      </button>
    </div>
  );
}
```

### Example 2: Data Rectification Form

```typescript
// components/UpdateDataForm.tsx
'use client';

import { useState, useEffect } from 'react';

export default function UpdateDataForm({ userEmail }: { userEmail: string }) {
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    phone: '',
    delivery_city: '',
  });

  useEffect(() => {
    // Load current data
    fetch(`/api/gdpr/rectification?email=${encodeURIComponent(userEmail)}`)
      .then((res) => res.json())
      .then((data) => setFormData(data.data));
  }, [userEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await fetch('/api/gdpr/rectification', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, updates: formData }),
    });

    const result = await response.json();
    alert(`Updated ${result.updatedCount} fields successfully`);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Name"
      />
      <input
        value={formData.surname}
        onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
        placeholder="Surname"
      />
      <button type="submit">Update My Data</button>
    </form>
  );
}
```

---

## Testing

### Test with cURL

```bash
# Test consent recording
curl -X POST http://localhost:3000/api/gdpr/consent \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","consents":[{"type":"analytics","granted":true}],"version":"1.0"}'

# Test data export
curl -X GET "http://localhost:3000/api/gdpr/export?email=test@example.com&format=json" \
  --output user-data.json

# Test data rectification
curl -X PUT http://localhost:3000/api/gdpr/rectification \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","updates":{"name":"Іван","surname":"Петренко"}}'

# Test deletion request
curl -X POST http://localhost:3000/api/gdpr/deletion \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## Database Tables Used

These endpoints interact with the following tables:

- `user_consents`: Consent records
- `privacy_policy_acceptances`: Privacy policy acceptances
- `gdpr_audit_log`: Audit trail for all GDPR actions
- `data_deletion_requests`: Scheduled deletions
- `orders`: User personal data and order history
- `carts`: Shopping cart data
- `sessions`: User session data

---

## Next Steps

1. **Add Authentication**: Implement user authentication before production
2. **Add Rate Limiting**: Prevent API abuse
3. **Email Notifications**: Send confirmation emails for data operations
4. **Admin Dashboard**: Create admin interface for processing requests
5. **Automated Testing**: Write integration tests for all endpoints

---

## Support

For questions about GDPR compliance:
- **Email**: privacy@dekop.ua
- **DPO**: dpo@dekop.ua (when appointed)

---

**Document Version**: 1.0
**Created**: November 2024
**Last Updated**: November 2024
