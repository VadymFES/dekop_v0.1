#!/bin/bash

# Test Email Sending Script for Resend
# Usage: ./test-email.sh your@email.com

if [ -z "$1" ]; then
  echo "❌ Error: Email address required"
  echo "Usage: ./test-email.sh your@email.com"
  echo ""
  echo "Example: ./test-email.sh user@example.com"
  exit 1
fi

EMAIL="$1"
URL="http://localhost:3000/api/test/email?test_email=${EMAIL}"

echo "📧 Sending test email to: $EMAIL"
echo "🔗 Using URL: $URL"
echo ""
echo "⏳ Sending..."
echo ""

# Send POST request and format JSON response
curl -X POST "$URL" -H "Content-Type: application/json" | jq '.' 2>/dev/null || curl -X POST "$URL"

echo ""
echo ""
echo "✅ Done! Check your inbox at $EMAIL"
echo ""
echo "📝 Note: If sending failed, check:"
echo "   1. RESEND_API_KEY is set correctly in .env.local"
echo "   2. Your email is verified in Resend (or use your Resend signup email for testing)"
echo "   3. The development server is running (npm run dev)"
