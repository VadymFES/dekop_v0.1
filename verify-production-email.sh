#!/bin/bash

# Production Email Configuration Verifier
# Usage: ./verify-production-email.sh https://your-production-domain.com

if [ -z "$1" ]; then
  echo "❌ Error: Production URL required"
  echo "Usage: ./verify-production-email.sh https://your-production-domain.com"
  echo ""
  echo "Example: ./verify-production-email.sh https://dekop-v01.vercel.app"
  exit 1
fi

PROD_URL="$1"
# Remove trailing slash if present
PROD_URL="${PROD_URL%/}"

echo "🔍 Verifying Production Email Configuration"
echo "================================================"
echo "Production URL: $PROD_URL"
echo ""

# Test 1: Check configuration
echo "📋 Test 1: Checking Email Configuration..."
echo "-------------------------------------------"
CONFIG_RESPONSE=$(curl -s "${PROD_URL}/api/test/email")
echo "$CONFIG_RESPONSE" | jq '.' 2>/dev/null || echo "$CONFIG_RESPONSE"
echo ""

# Check if API key is configured
if echo "$CONFIG_RESPONSE" | grep -q '"resendKeyConfigured":true'; then
  echo "✅ RESEND_API_KEY is configured"
else
  echo "❌ RESEND_API_KEY is NOT configured"
  echo ""
  echo "🔧 FIX: Add environment variables in Vercel:"
  echo "   1. Go to https://vercel.com/dashboard"
  echo "   2. Select your project"
  echo "   3. Settings → Environment Variables"
  echo "   4. Add: RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME"
  echo "   5. Redeploy your application"
  exit 1
fi
echo ""

# Test 2: Check from email
echo "📋 Test 2: Checking From Email..."
echo "-------------------------------------------"
FROM_EMAIL=$(echo "$CONFIG_RESPONSE" | jq -r '.config.fromEmail' 2>/dev/null)
echo "From Email: $FROM_EMAIL"

if [ "$FROM_EMAIL" = "onboarding@resend.dev" ]; then
  echo "⚠️  Using Resend's test domain"
  echo "   This is OK for testing, but verify dekop.com.ua for production"
elif [[ "$FROM_EMAIL" == *"@dekop.com.ua" ]]; then
  echo "✅ Using dekop.com.ua domain"
  echo "⚠️  IMPORTANT: Verify this domain in Resend dashboard!"
  echo "   → https://resend.com/domains"
else
  echo "⚠️  Using domain: $FROM_EMAIL"
fi
echo ""

# Test 3: Prompt for test email (optional)
echo "📋 Test 3: Send Test Email (Optional)"
echo "-------------------------------------------"
read -p "Send test email? Enter email address (or press Enter to skip): " TEST_EMAIL

if [ ! -z "$TEST_EMAIL" ]; then
  echo ""
  echo "📧 Sending test email to: $TEST_EMAIL"
  echo "⏳ Please wait..."

  TEST_RESPONSE=$(curl -s -X POST "${PROD_URL}/api/test/email?test_email=${TEST_EMAIL}")
  echo ""
  echo "$TEST_RESPONSE" | jq '.' 2>/dev/null || echo "$TEST_RESPONSE"
  echo ""

  if echo "$TEST_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Test email sent successfully!"
    echo "📬 Check your inbox at: $TEST_EMAIL"
  else
    echo "❌ Test email failed"
    echo ""
    echo "🔧 Common fixes:"
    echo "   1. Domain not verified → Verify dekop.com.ua in Resend"
    echo "   2. API key invalid → Check RESEND_API_KEY in Vercel"
    echo "   3. Rate limit hit → Check Resend dashboard"
    echo ""
    echo "📊 Check detailed logs:"
    echo "   - Vercel: https://vercel.com/dashboard → Deployments → Functions"
    echo "   - Resend: https://resend.com/logs"
  fi
else
  echo "Skipped test email"
fi
echo ""

echo "================================================"
echo "✅ Verification Complete"
echo ""
echo "📚 Next Steps:"
echo "   1. Verify domain at: https://resend.com/domains"
echo "   2. Check Resend logs: https://resend.com/logs"
echo "   3. View Vercel logs: https://vercel.com/dashboard"
echo "   4. Read guide: PRODUCTION_EMAIL_DEBUG.md"
echo ""
