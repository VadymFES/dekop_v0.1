#!/bin/bash

# Sentry Integration Test Script
# Run this after starting your dev server (npm run dev)

echo "🧪 Sentry Integration Test Suite"
echo "================================="
echo ""

BASE_URL="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    
    echo -n "Testing $name... "
    response=$(curl -s "$url")
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ PASS${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Check if server is running
echo "1️⃣  Checking if dev server is running..."
if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${RED}✗ Dev server not running${NC}"
    echo "Please start it with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Dev server is running${NC}"
echo ""

# Test configuration
echo "2️⃣  Testing Sentry configuration..."
config_response=$(curl -s "$BASE_URL/api/test-sentry")
if echo "$config_response" | grep -q 'sentryDsnConfigured.*true'; then
    echo -e "${GREEN}✓ Server-side DSN configured${NC}"
else
    echo -e "${YELLOW}⚠ Server-side DSN not configured${NC}"
    echo "Add SENTRY_DSN to .env.local"
fi

if echo "$config_response" | grep -q 'publicSentryDsnConfigured.*true'; then
    echo -e "${GREEN}✓ Client-side DSN configured${NC}"
else
    echo -e "${YELLOW}⚠ Client-side DSN not configured${NC}"
    echo "Add NEXT_PUBLIC_SENTRY_DSN to .env.local"
fi
echo ""

# Run tests
echo "3️⃣  Running integration tests..."
echo ""

test_endpoint "Info Logging" "$BASE_URL/api/test-sentry?type=info"
test_endpoint "Error Capturing" "$BASE_URL/api/test-sentry?type=error"
test_endpoint "Security Events" "$BASE_URL/api/test-sentry?type=security"
test_endpoint "Payment Audit Logs" "$BASE_URL/api/test-sentry?type=payment"
test_endpoint "Direct Sentry Message" "$BASE_URL/api/test-sentry?type=direct"
test_endpoint "Performance Tracking" "$BASE_URL/api/test-sentry?type=performance"
test_endpoint "Handled Errors" "$BASE_URL/api/test-sentry?type=handled-error"

echo ""
echo "================================="
echo "✅ Test suite complete!"
echo ""
echo "📊 Next steps:"
echo "1. Check browser console for CSP errors"
echo "2. Visit: http://localhost:3000/api/test-sentry"
echo "3. Check Sentry dashboard: https://sentry.io/"
echo "4. Look for test events in Issues tab"
echo ""
