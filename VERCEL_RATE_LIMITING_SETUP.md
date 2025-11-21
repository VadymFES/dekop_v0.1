# Vercel Firewall Rate Limiting Configuration

This guide explains how to configure rate limiting for your API endpoints using Vercel's built-in firewall.

## Why Vercel Firewall?

- **Edge-level protection**: Blocks requests before they reach your application
- **Better performance**: No application code overhead
- **Distributed**: Works across all edge locations automatically
- **DDoS protection**: Enterprise-grade protection included
- **No Redis required**: Managed by Vercel infrastructure

## Prerequisites

- Vercel Pro or Enterprise plan (Firewall is not available on Hobby plan)
- Your project deployed to Vercel
- Access to Vercel dashboard

## Configuration Steps

### 1. Access Vercel Firewall

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`dekop_v0.1`)
3. Navigate to **Settings** → **Firewall**
4. Click **Enable Firewall** if not already enabled

### 2. Create Rate Limiting Rules

Create the following rules for different endpoint types:

#### Rule 1: Order Creation Endpoint
```
Name: Rate Limit - Order Creation
Path Pattern: /api/orders/create
Method: POST
Rate Limit: 5 requests per minute per IP
Action: Rate Limit (429 response)
```

**Configuration:**
- Click **Add Rule**
- Rule Type: **Rate Limiting**
- Name: `Rate Limit - Order Creation`
- Conditions:
  - Path: equals `/api/orders/create`
  - Method: equals `POST`
- Rate Limit Settings:
  - Limit: `5`
  - Window: `1 minute`
  - Key: `IP Address`
- Action: **Rate Limit** (returns 429 Too Many Requests)

#### Rule 2: Payment Endpoints
```
Name: Rate Limit - Payment Endpoints
Path Pattern: /api/payments/*
Method: POST
Rate Limit: 10 requests per minute per IP
Action: Rate Limit (429 response)
```

**Configuration:**
- Click **Add Rule**
- Rule Type: **Rate Limiting**
- Name: `Rate Limit - Payment Endpoints`
- Conditions:
  - Path: starts with `/api/payments/`
  - Method: equals `POST`
- Rate Limit Settings:
  - Limit: `10`
  - Window: `1 minute`
  - Key: `IP Address`
- Action: **Rate Limit**

#### Rule 3: Cart Operations
```
Name: Rate Limit - Cart Operations
Path Pattern: /cart/api/*
Method: POST, PATCH, DELETE
Rate Limit: 30 requests per minute per IP
Action: Rate Limit (429 response)
```

**Configuration:**
- Click **Add Rule**
- Rule Type: **Rate Limiting**
- Name: `Rate Limit - Cart Operations`
- Conditions:
  - Path: starts with `/cart/api/`
  - Method: in `POST`, `PATCH`, `DELETE`
- Rate Limit Settings:
  - Limit: `30`
  - Window: `1 minute`
  - Key: `IP Address`
- Action: **Rate Limit**

#### Rule 4: Webhook Endpoints
```
Name: Rate Limit - Webhooks
Path Pattern: /api/webhooks/*
Method: POST
Rate Limit: 20 requests per minute per IP
Action: Rate Limit (429 response)
```

**Configuration:**
- Click **Add Rule**
- Rule Type: **Rate Limiting**
- Name: `Rate Limit - Webhooks`
- Conditions:
  - Path: starts with `/api/webhooks/`
  - Method: equals `POST`
- Rate Limit Settings:
  - Limit: `20`
  - Window: `1 minute`
  - Key: `IP Address`
- Action: **Rate Limit**

#### Rule 5: Test Endpoints
```
Name: Rate Limit - Test Endpoints
Path Pattern: /api/test/*
Method: GET, POST
Rate Limit: 5 requests per 5 minutes per IP
Action: Rate Limit (429 response)
```

**Configuration:**
- Click **Add Rule**
- Rule Type: **Rate Limiting**
- Name: `Rate Limit - Test Endpoints`
- Conditions:
  - Path: starts with `/api/test/`
  - Method: in `GET`, `POST`
- Rate Limit Settings:
  - Limit: `5`
  - Window: `5 minutes`
  - Key: `IP Address`
- Action: **Rate Limit**

#### Rule 6: General API Read Operations
```
Name: Rate Limit - API Read Operations
Path Pattern: /api/*
Method: GET
Rate Limit: 100 requests per minute per IP
Action: Rate Limit (429 response)
```

**Configuration:**
- Click **Add Rule**
- Rule Type: **Rate Limiting**
- Name: `Rate Limit - API Read Operations`
- Conditions:
  - Path: starts with `/api/`
  - Method: equals `GET`
- Rate Limit Settings:
  - Limit: `100`
  - Window: `1 minute`
  - Key: `IP Address`
- Action: **Rate Limit**

### 3. Configure Advanced Settings (Optional)

#### Bot Protection
Enable bot protection to automatically block malicious bots:
1. Go to **Firewall** → **Bot Protection**
2. Enable **Bot Protection**
3. Set action to **Challenge** or **Block**

#### IP Allowlist (for webhooks)
If your payment providers use fixed IPs, whitelist them:
1. Go to **Firewall** → **IP Rules**
2. Add allowed IP addresses for LiqPay and Monobank webhooks
3. This prevents legitimate webhooks from being rate limited

### 4. Monitor and Adjust

#### View Analytics
1. Go to **Firewall** → **Analytics**
2. Monitor rate limit triggers
3. Adjust limits based on legitimate traffic patterns

#### Set Up Alerts
1. Go to **Settings** → **Notifications**
2. Enable alerts for:
   - High rate limit triggers
   - Firewall rule changes
   - Unusual traffic patterns

## Testing Rate Limits

### Test Order Creation (5/min)
```bash
# This should fail on the 6th request within 1 minute
for i in {1..6}; do
  curl -X POST https://your-domain.com/api/orders/create \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}'
  echo "Request $i"
  sleep 1
done
```

### Test Payment Endpoint (10/min)
```bash
# This should fail on the 11th request within 1 minute
for i in {1..11}; do
  curl -X POST https://your-domain.com/api/payments/liqpay/create \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}'
  echo "Request $i"
  sleep 1
done
```

## Rate Limit Response

When rate limited, Vercel returns:
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded"
  }
}
```

HTTP Status: `429 Too Many Requests`

Headers included:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)
- `Retry-After`: Seconds to wait before retrying

## Recommended Settings Summary

| Endpoint Type | Path Pattern | Rate Limit | Window |
|--------------|--------------|------------|---------|
| Order Creation | `/api/orders/create` | 5 | 1 min |
| Payment | `/api/payments/*` | 10 | 1 min |
| Cart Operations | `/cart/api/*` | 30 | 1 min |
| Webhooks | `/api/webhooks/*` | 20 | 1 min |
| Test Endpoints | `/api/test/*` | 5 | 5 min |
| API Reads | `/api/*` (GET) | 100 | 1 min |

## Troubleshooting

### Legitimate Users Getting Rate Limited

If legitimate users are getting rate limited:
1. Review analytics to identify patterns
2. Increase limits for specific endpoints
3. Consider using authenticated rate limiting (per user ID instead of IP)
4. Whitelist known IP addresses (for B2B clients)

### Webhooks Failing

If payment webhooks are failing:
1. Whitelist payment provider IPs in **IP Rules**
2. Create exception rule for webhook endpoints with higher limits
3. Use webhook signatures for authentication instead of rate limiting

### Rule Not Working

1. Check rule order (rules are evaluated top-to-bottom)
2. Verify path patterns match exactly
3. Check deployment - rules apply to production domain
4. Wait 1-2 minutes for rule propagation

## Alternative: Vercel.json Configuration

You can also configure rate limiting in `vercel.json`:

```json
{
  "firewall": {
    "rules": [
      {
        "name": "Rate Limit Order Creation",
        "action": {
          "type": "rate-limit",
          "limit": 5,
          "window": 60
        },
        "condition": {
          "type": "path",
          "op": "eq",
          "value": "/api/orders/create"
        }
      }
    ]
  }
}
```

However, **dashboard configuration is recommended** for easier management and real-time updates.

## Security Best Practices

1. **Start Conservative**: Begin with lower limits and increase based on traffic
2. **Monitor Regularly**: Review firewall analytics weekly
3. **Combine with Authentication**: Rate limiting + API keys provide layered security
4. **Set Up Alerts**: Get notified of unusual patterns
5. **Document Changes**: Keep track of limit adjustments and reasons
6. **Test Regularly**: Verify rate limits work as expected

## Cost Considerations

- Vercel Firewall is included in Pro plan ($20/month per member)
- No additional cost for rate limiting rules
- No Redis or infrastructure costs
- Scales automatically with traffic

## Next Steps

1. ✅ Enable Vercel Firewall
2. ✅ Create rate limiting rules as documented above
3. ✅ Enable bot protection
4. ✅ Set up monitoring and alerts
5. ✅ Test all critical endpoints
6. ✅ Remove application-level rate limiting code (see cleanup guide)

## Support

- [Vercel Firewall Documentation](https://vercel.com/docs/security/vercel-firewall)
- [Vercel Support](https://vercel.com/support)
- [Community Forum](https://github.com/vercel/vercel/discussions)
