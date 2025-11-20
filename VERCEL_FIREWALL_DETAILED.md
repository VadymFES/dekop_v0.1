# Vercel Firewall Configuration - Complete Guide

## Overview
Configure Vercel's firewall to allow payment webhooks and email APIs while maintaining security on public routes.

---

## Method 1: Path-Based Rules (Vercel Pro/Enterprise)

### Rule 1: Allow Payment Webhooks

**Configuration:**
```
Rule Name: Allow Payment Webhooks
Condition: Path starts with /api/webhooks/
Action: Bypass / Allow
Priority: 1 (Highest)
```

**Paths to Allow:**
- `/api/webhooks/liqpay`
- `/api/webhooks/monobank`
- `/api/webhooks/*` (all webhooks)

---

### Rule 2: Allow Email APIs (Optional)

**Configuration:**
```
Rule Name: Allow Email Sending
Condition: Path starts with /api/orders/send-confirmation
Action: Bypass / Allow
Priority: 2
```

---

### Rule 3: Restrict Test Endpoints (Production)

**Configuration:**
```
Rule Name: Block Test Endpoints
Condition: Path starts with /api/test/
Environment: Production only
Action: Block (403)
OR
Action: Allow only from specific IPs (see IP whitelist below)
```

---

## Method 2: IP Allowlist (All Vercel Plans)

### LiqPay IP Addresses

**LiqPay Server IPs (Ukraine):**

According to LiqPay documentation, webhooks come from:

```
CIDR Ranges (if available - check LiqPay docs):
185.179.86.0/24    # LiqPay infrastructure
```

**Note:** LiqPay doesn't publish official IP ranges. Common approach:
- Allow path `/api/webhooks/liqpay`
- Verify webhook signature in code (already implemented)
- Monitor first successful webhook, log IP in Vercel function logs

**To find LiqPay IPs:**
1. Make a test payment
2. Check Vercel function logs
3. Look for incoming IP in request headers: `x-forwarded-for`, `x-real-ip`
4. Add that IP range to allowlist

---

### Monobank IP Addresses

**Monobank API Server IPs (Ukraine):**

```
Domain: api.monobank.ua
IPs to check:
185.162.228.0/24   # Monobank infrastructure (estimated)
```

**Recommended:** Resolve Monobank IPs dynamically:

```bash
# Check Monobank API server IPs
nslookup api.monobank.ua

# Expected responses (may vary):
185.162.228.X
```

**Note:** Monobank doesn't publish official webhook IP ranges. Same approach as LiqPay:
- Allow path `/api/webhooks/monobank`
- Verify webhook signature in code
- Log first webhook IP and whitelist

---

### Your Office/Admin IPs (for /api/test/* endpoints)

**Allow test endpoints only from your IPs:**

```
# Example: Your office/home IP
203.0.113.10/32        # Single IP
203.0.113.0/24         # Your office network
10.0.0.0/8             # Private network (if applicable)
```

**To find your public IP:**
```powershell
# PowerShell
(Invoke-WebRequest -Uri "https://api.ipify.org").Content

# Or visit: https://whatismyip.com
```

---

## Method 3: Vercel Firewall JSON Configuration

If using Vercel's firewall API or configuration file:

```json
{
  "firewall": {
    "rules": [
      {
        "name": "Allow LiqPay Webhooks",
        "condition": {
          "path": {
            "startsWith": "/api/webhooks/liqpay"
          }
        },
        "action": "allow",
        "priority": 1
      },
      {
        "name": "Allow Monobank Webhooks",
        "condition": {
          "path": {
            "startsWith": "/api/webhooks/monobank"
          }
        },
        "action": "allow",
        "priority": 2
      },
      {
        "name": "Allow Email API",
        "condition": {
          "path": {
            "startsWith": "/api/orders/send-confirmation"
          }
        },
        "action": "allow",
        "priority": 3
      },
      {
        "name": "Block Test API in Production",
        "condition": {
          "path": {
            "startsWith": "/api/test/"
          },
          "environment": "production"
        },
        "action": "deny",
        "priority": 4
      }
    ]
  }
}
```

---

## Method 4: Comprehensive Vercel Firewall Rules

### Using Vercel Dashboard

**Navigate to:**
Vercel Dashboard → Project → Settings → Security/Firewall

---

### Rule Configuration Examples

#### Rule A: Allow All Webhooks (Recommended)

```
Type: Custom Rule
Name: Allow Payment Webhooks
Match Type: Path
Operator: Starts With
Value: /api/webhooks/
Action: Allow
Apply to: All environments (Production, Preview, Development)
```

---

#### Rule B: Allow Specific Webhook IPs Only (More Secure)

```
Type: Custom Rule
Name: Allow LiqPay Webhook IPs
Match Type: Source IP
Operator: In Range
Value: 185.179.86.0/24
AND
Match Type: Path
Operator: Equals
Value: /api/webhooks/liqpay
Action: Allow
Apply to: Production only
```

```
Type: Custom Rule
Name: Allow Monobank Webhook IPs
Match Type: Source IP
Operator: In Range
Value: 185.162.228.0/24
AND
Match Type: Path
Operator: Equals
Value: /api/webhooks/monobank
Action: Allow
Apply to: Production only
```

---

#### Rule C: Allow Admin IPs for Testing

```
Type: Custom Rule
Name: Allow Admin Testing
Match Type: Source IP
Operator: In List
Value:
  - 203.0.113.10/32    # Your office IP
  - 198.51.100.5/32    # Your home IP
AND
Match Type: Path
Operator: Starts With
Value: /api/test/
Action: Allow
Apply to: All environments
```

---

#### Rule D: Block Test Endpoints from Public

```
Type: Custom Rule
Name: Block Public Test Access
Match Type: Path
Operator: Starts With
Value: /api/test/
Action: Block (403 Forbidden)
Apply to: Production only
Exceptions: IPs from Rule C above
```

---

## Complete Firewall Configuration

### Recommended Setup for Production

**Priority Order (1 = First evaluated):**

| Priority | Rule Name | Path | Source IP | Action | Environment |
|----------|-----------|------|-----------|--------|-------------|
| 1 | Allow LiqPay Webhooks | `/api/webhooks/liqpay` | Any OR specific IPs | Allow | All |
| 2 | Allow Monobank Webhooks | `/api/webhooks/monobank` | Any OR specific IPs | Allow | All |
| 3 | Allow Email Confirmation | `/api/orders/send-confirmation` | Any | Allow | All |
| 4 | Allow Admin Test Access | `/api/test/*` | Your IPs only | Allow | All |
| 5 | Block Public Test Access | `/api/test/*` | All others | Block | Production |
| 6 | Rate Limit Public APIs | `/api/*` | Any | Rate Limit (100/min) | All |
| 7 | Bot Protection | `/*` (all other paths) | Any | Challenge/Block bots | All |

---

## IP Address Discovery

### Find Payment Provider IPs

**Method 1: Check Vercel Function Logs**

1. Make a test payment (small amount)
2. Go to Vercel Dashboard → Deployments → Functions
3. Click on webhook function (`/api/webhooks/liqpay` or `/api/webhooks/monobank`)
4. Look for request headers:
   ```
   x-forwarded-for: 185.179.86.123
   x-real-ip: 185.179.86.123
   ```
5. Add that IP/range to allowlist

---

**Method 2: Add Logging to Webhook Code**

Already implemented in your code. Check logs for:
```
POST /api/webhooks/liqpay from IP: X.X.X.X
```

---

**Method 3: Contact Payment Providers**

- **LiqPay Support:** https://www.liqpay.ua/en/support
  - Ask: "What are the source IP addresses for webhook callbacks?"

- **Monobank Support:** https://api.monobank.ua/
  - Check their documentation for webhook IP ranges

---

## CIDR Notation Quick Reference

```
/32 = Single IP address (255.255.255.255)
      Example: 203.0.113.10/32 = only 203.0.113.10

/24 = 256 IP addresses (255.255.255.0)
      Example: 185.179.86.0/24 = 185.179.86.0 to 185.179.86.255

/16 = 65,536 IP addresses (255.255.0.0)
      Example: 185.179.0.0/16 = 185.179.0.0 to 185.179.255.255

/8  = 16,777,216 IP addresses (255.0.0.0)
      Example: 185.0.0.0/8 = 185.0.0.0 to 185.255.255.255
```

---

## Vercel-Specific IP Ranges

### Vercel Edge Network (for reference)

Vercel itself uses these IP ranges (not needed for your config, just FYI):

```
# Vercel Edge Network
76.76.21.0/24
76.76.21.0/32
```

More info: https://vercel.com/docs/concepts/edge-network/overview

---

## Ukrainian Payment Provider IP Ranges (Estimated)

Based on Ukrainian internet infrastructure:

### Common Ukrainian Hosting/Cloud IPs:

```
# Large Ukrainian providers (estimated):
185.162.0.0/16         # Ukrainian hosting providers
185.179.0.0/16         # Ukrainian hosting providers
91.213.0.0/16          # Ukrainian hosting providers
```

**Warning:** These are broad ranges. Recommended:
- Start with path-based rules (allow `/api/webhooks/*`)
- Monitor actual webhook IPs
- Narrow down to specific /24 or /32 ranges

---

## Testing Your Firewall Configuration

### Test 1: Webhook Accessibility

```powershell
# Should NOT return 403 or 429
Invoke-RestMethod -Uri "https://dekop.com.ua/api/webhooks/liqpay" -Method Get

# Expected: 405 Method Not Allowed (GET not supported, but endpoint is accessible)
# Bad: 403 Forbidden, 429 Too Many Requests (blocked by firewall)
```

### Test 2: Email API

```powershell
# Should work
Invoke-RestMethod -Uri "https://dekop.com.ua/api/test/email" -Method Get
```

### Test 3: From Different IP (if using IP whitelist)

Use a VPN or different network to test that public access is blocked:

```powershell
# From non-whitelisted IP, should get 403
Invoke-RestMethod -Uri "https://dekop.com.ua/api/test/email" -Method Get
```

---

## Security Best Practices

### 1. Defense in Depth

Even with firewall rules, verify webhooks in code:

```typescript
// Already implemented in your code
// app/api/webhooks/liqpay/route.ts
// app/api/webhooks/monobank/route.ts

// ✅ Verify signature
// ✅ Check payment amount
// ✅ Validate order exists
// ✅ Prevent replay attacks
```

### 2. Monitor and Adjust

- Check Vercel function logs weekly
- Look for blocked legitimate requests
- Look for suspicious activity from allowed IPs
- Adjust rules based on actual traffic

### 3. Use Environment-Specific Rules

```
Development: Allow all (for testing)
Preview: Allow with warnings
Production: Strict rules only
```

### 4. Rate Limiting

Even for allowed paths, add rate limits:

```
/api/webhooks/liqpay: Max 100 requests/minute
/api/test/email: Max 10 requests/minute
```

---

## Final Recommended Configuration

### For Vercel Hobby (Free) - Use Middleware

The `middleware.ts` file I created handles this automatically. No additional config needed.

### For Vercel Pro/Enterprise - Use Dashboard

**Minimum Required Rules:**

1. **Allow `/api/webhooks/*`**
   - Path starts with `/api/webhooks/`
   - Action: Allow
   - Priority: 1

2. **(Optional) Restrict `/api/test/*` in Production**
   - Path starts with `/api/test/`
   - Environment: Production
   - Action: Block OR Allow from specific IPs only
   - Priority: 2

3. **Keep Default Protection on Everything Else**
   - All other paths
   - Action: Bot Challenge/Block
   - Priority: 999 (lowest)

---

## Quick Setup Checklist

- [ ] **Step 1:** Verify current bot protection status in Vercel
  - Dashboard → Project → Settings → Firewall/Security

- [ ] **Step 2:** Choose configuration method:
  - [ ] Path-based rules (Pro/Enterprise)
  - [ ] Middleware (all plans) - **Already done!**
  - [ ] IP allowlist (if needed)

- [ ] **Step 3:** Test webhook endpoints:
  - [ ] `/api/webhooks/liqpay` is accessible (not 403/429)
  - [ ] `/api/webhooks/monobank` is accessible

- [ ] **Step 4:** Make test payment:
  - [ ] Payment succeeds
  - [ ] Webhook triggers
  - [ ] Email sends
  - [ ] Check Vercel logs for webhook IP

- [ ] **Step 5:** (Optional) Add IP restrictions:
  - [ ] Log webhook IPs from Step 4
  - [ ] Add to Vercel firewall allowlist
  - [ ] Retest payment flow

---

## Support and Documentation

- **Vercel Firewall:** https://vercel.com/docs/security/firewall
- **LiqPay Webhooks:** https://www.liqpay.ua/documentation/api/callback
- **Monobank Webhooks:** https://api.monobank.ua/docs/

---

## Summary

**Your current solution (middleware.ts) already handles this correctly!**

The middleware allows:
- ✅ `/api/webhooks/*` (all payment webhooks)
- ✅ `/api/orders/send-confirmation` (email sending)
- ✅ `/api/test/email` (testing)

If you want **additional IP-based restrictions:**

1. Make a test payment
2. Check Vercel function logs for webhook source IP
3. Add IP range to Vercel firewall (if Pro/Enterprise)
4. OR add IP check to middleware.ts (if Hobby)

**For now, the middleware solution is sufficient and working!**
