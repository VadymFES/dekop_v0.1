# Webhook Security Configuration Guide

## Overview

Payment webhooks use **multiple layers of security**. Understanding these layers helps you make informed decisions about configuration.

---

## 🛡️ Security Layers (in order of importance)

### Layer 1: IP Whitelist Validation ⚠️ OPTIONAL
**Status:** Nice to have, but NOT required
**Purpose:** Additional defense layer
**Can be disabled:** ✅ Yes, safely

### Layer 2: Signature Verification 🔒 CRITICAL
**Status:** **REQUIRED** - Primary security mechanism
**Purpose:** Cryptographic proof that webhook is from payment provider
**Can be disabled:** ❌ NO - this would be a critical vulnerability

### Layer 3: Replay Attack Prevention 🔒 CRITICAL
**Status:** **REQUIRED**
**Purpose:** Prevents duplicate webhook processing
**Can be disabled:** ❌ NO

### Layer 4: Timestamp Validation 🔒 IMPORTANT
**Status:** Strongly recommended
**Purpose:** Prevents old webhook replay
**Can be disabled:** Only in emergencies

---

## 🤔 What if I can't get Monobank/LiqPay IPs?

**Short answer:** It's perfectly safe to disable IP validation.

**Why it's safe:**
- Signature verification (Layer 2) is cryptographically secure
- Even if an attacker knows the webhook URL, they can't forge valid signatures
- Monobank uses RSA-SHA256 signatures with their private key
- LiqPay uses SHA1-based signatures with your private key
- Without these keys, it's mathematically infeasible to create valid webhooks

---

## 📋 Configuration Options

### Option 1: Disable IP Validation Globally (Recommended if IPs unavailable)

```bash
# In your .env file
DISABLE_WEBHOOK_IP_VALIDATION=true
```

**This will:**
- ✅ Skip IP checks for all webhook providers
- ✅ Still validate signatures (primary security)
- ✅ Still prevent replay attacks
- ✅ Still validate timestamps
- ✅ Log that IP validation is disabled

**Use this when:**
- Payment provider doesn't publish webhook IPs
- Provider uses cloud infrastructure with dynamic IPs
- You want simpler configuration

### Option 2: Configure Specific IPs

If you CAN obtain IPs, add them to `app/lib/webhook-security.ts`:

```typescript
const LIQPAY_IP_WHITELIST = [
  '91.226.25.0/24',    // LiqPay production
  '77.120.109.0/24',   // LiqPay backup
];

const MONOBANK_IP_WHITELIST = [
  '195.69.188.0/24',   // Monobank production
];
```

### Option 3: Leave Empty (Automatic Fallback)

The system will automatically skip IP validation if:
- IP whitelist arrays are empty
- No real IPs are configured

---

## 🔍 How to Get Provider IPs

### For Monobank:

1. **Contact Support:**
   ```
   Email: support@monobank.ua
   Subject: Webhook IP ranges for acquiring API
   ```

2. **Check Documentation:**
   - https://api.monobank.ua/docs/acquiring.html
   - Look for "Webhook IP addresses" section

3. **Monitor Logs:**
   ```bash
   # Check your production logs for webhook IPs
   grep "SECURITY" /var/log/app.log | grep monobank
   ```

4. **Alternative:** If Monobank uses AWS/GCP/Azure, they likely have dynamic IPs → use Option 1

### For LiqPay:

1. **Contact Support:**
   ```
   Email: support@liqpay.ua
   Subject: IP адреси для webhook callback
   ```

2. **Check Documentation:**
   - https://www.liqpay.ua/documentation/api
   - Look for "Server Callback" section

3. **Known IPs (verify with LiqPay):**
   - Primary: `91.226.25.0/24`
   - Backup: `77.120.109.0/24`

---

## 🧪 Testing Webhook Security

### Test 1: Verify Signature Validation Works

```bash
# Send webhook with invalid signature
curl -X POST https://yourdomain.com/api/webhooks/monobank \
  -H "x-sign: invalid_signature" \
  -d '{"invoiceId":"test","status":"success"}'

# Expected: 400 Bad Request - "Webhook signature verification failed"
```

### Test 2: Test Replay Attack Prevention

```bash
# Send same webhook twice quickly
curl -X POST https://yourdomain.com/api/webhooks/monobank \
  -H "x-sign: valid_signature" \
  -d '{"invoiceId":"test123","status":"success"}'

# Second request should return: 409 Conflict - "Duplicate webhook"
```

### Test 3: IP Validation (if enabled)

```bash
# From non-whitelisted IP
curl -X POST https://yourdomain.com/api/webhooks/monobank \
  -d '{"invoiceId":"test","status":"success"}'

# Expected: 403 Forbidden (if IP validation enabled and IPs configured)
```

---

## 📊 Security Comparison

| Configuration | Security Level | Ease of Use | Recommended |
|--------------|----------------|-------------|-------------|
| All layers enabled | ⭐⭐⭐⭐⭐ Excellent | Medium | If IPs available |
| No IP validation | ⭐⭐⭐⭐ Very Good | Easy | **If IPs unavailable** |
| Only signatures | ⭐⭐⭐ Good | Easy | Minimum acceptable |
| No signatures | ❌ Vulnerable | N/A | **NEVER USE** |

---

## 🚨 Important: What NOT to do

❌ **DO NOT disable signature verification**
```typescript
// NEVER DO THIS:
const isValid = true; // Always accept webhooks
```

❌ **DO NOT skip replay protection**
```typescript
// NEVER DO THIS:
// if (!isWebhookUnique(webhookId)) { /* skip check */ }
```

❌ **DO NOT accept webhooks without validation**
```typescript
// NEVER DO THIS:
export async function POST(request: Request) {
  const payload = await request.json();
  // Process without any checks ← CRITICAL VULNERABILITY
}
```

---

## ✅ Recommended Configuration

**For most users:**

```bash
# .env
MONOBANK_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."
LIQPAY_PRIVATE_KEY="your_key_here"
DISABLE_WEBHOOK_IP_VALIDATION=true  # Safe to disable
```

**Why this is secure:**
1. ✅ Signature verification ensures only real payment providers can send webhooks
2. ✅ Replay protection prevents duplicate processing
3. ✅ Timestamp validation prevents old webhook replay
4. ✅ Simpler configuration with no loss in practical security

---

## 📞 Need Help?

**If payment providers don't respond:**
- Continue with `DISABLE_WEBHOOK_IP_VALIDATION=true`
- Monitor webhook logs for suspicious patterns
- Consider additional monitoring (Sentry, DataDog)
- Set up alerts for webhook failures

**Security questions:**
- Review: `SECURITY.md` for full security documentation
- Check logs: `[SECURITY]` tagged entries
- Test webhooks: Use provider sandbox/test environments first

---

## 📈 Monitoring Recommendations

Even without IP validation, you should monitor:

```javascript
// Check logs for:
- Multiple webhooks from same IP in short time
- Webhooks with invalid signatures
- Replay attacks detected
- Unusual webhook patterns
```

**Set up alerts for:**
- Signature validation failures > 5 per hour
- Replay attacks detected
- Webhooks from unexpected countries (if available)

---

## Summary

🎯 **Bottom Line:**
- **Signature verification is the critical security layer**
- **IP validation is optional extra protection**
- **Safe to disable IP validation if provider IPs unavailable**
- **NEVER disable signature verification**

✅ **Action Items:**
1. Set `DISABLE_WEBHOOK_IP_VALIDATION=true` in `.env`
2. Ensure Monobank public key is configured
3. Ensure LiqPay private key is configured
4. Test webhooks in sandbox environment
5. Monitor logs for the first few days

Your webhooks will be secure! 🔒
