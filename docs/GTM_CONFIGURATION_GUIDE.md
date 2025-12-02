# Google Tag Manager Configuration Guide

Complete step-by-step guide for configuring Google Tag Manager (GTM) with e-commerce tracking for Dekop Furniture Enterprise.

> **📢 What's New?** Check out [GTM_WHATS_NEW.md](./GTM_WHATS_NEW.md) for the latest features including:
> - ✅ Accurate purchase tracking (only paid orders)
> - ❌ Payment cancellation tracking
> - 🐛 Fixed view_item double-firing bug

## Table of Contents

1. [GTM Account Setup](#1-gtm-account-setup)
2. [Install GTM Container](#2-install-gtm-container)
3. [Configure GA4 Property](#3-configure-ga4-property)
4. [E-commerce Data Layer Variables](#4-e-commerce-data-layer-variables)
5. [E-commerce Event Tags](#5-e-commerce-event-tags)
6. [Testing & Debugging](#6-testing--debugging)
7. [Publishing Container](#7-publishing-container)

---

## 1. GTM Account Setup

### Create GTM Account

1. Go to [Google Tag Manager](https://tagmanager.google.com)
2. Click **Create Account**
3. Fill in account details:
   - **Account Name**: `Dekop Furniture Enterprise`
   - **Country**: Ukraine
   - **Container Name**: `dekopfurniture.com.ua` (or your domain)
   - **Target Platform**: Web
4. Accept Terms of Service
5. Click **Create**

### Note Your GTM ID

- Your GTM ID will look like: `GTM-XXXXXXX`
- This is already configured in the app as: **GTM-TVVGC6PQ**

---

## 2. Install GTM Container

✅ **Already Completed** - GTM is installed in `app/layout.tsx` and `app/components/GoogleTagManager.tsx`

The implementation includes:
- GTM script loading with CSP compliance
- dataLayer initialization
- Noscript fallback for users with JavaScript disabled

---

## 3. Configure GA4 Property

### Create GA4 Property

1. Go to [Google Analytics](https://analytics.google.com)
2. Click **Admin** → **Create Property**
3. Fill in property details:
   - **Property Name**: `Dekop Furniture Enterprise`
   - **Reporting Time Zone**: `(GMT+02:00) Kyiv`
   - **Currency**: Ukrainian Hryvnia (UAH)
4. Click **Next** → Complete business information
5. Click **Create** → Accept terms

### Get Measurement ID

1. In GA4 Property, go to **Admin** → **Data Streams**
2. Click **Add Stream** → **Web**
3. Enter website URL and stream name
4. Copy your **Measurement ID** (format: `G-XXXXXXXXXX`)

### Connect GA4 to GTM

1. In GTM, click **Tags** → **New**
2. Name: `GA4 Configuration`
3. Tag Configuration:
   - Tag Type: **Google Analytics: GA4 Configuration**
   - Measurement ID: Enter your `G-XXXXXXXXXX`
4. Enable **Send Page View** (checked)
5. Click **Triggering** → Select **All Pages**
6. Click **Save**

---

## 4. E-commerce Data Layer Variables

### Create Built-in Variables

1. In GTM, go to **Variables**
2. Click **Configure** in Built-in Variables section
3. Enable these variables:
   - ✅ Page URL
   - ✅ Page Path
   - ✅ Page Title

### Create Custom Data Layer Variables

Create the following custom variables (for each, click **Variables** → **New** → **Data Layer Variable**):

#### E-commerce Variables

| Variable Name | Data Layer Variable Name | Default Value |
|--------------|--------------------------|---------------|
| `DLV - Ecommerce` | `ecommerce` | `undefined` |
| `DLV - Event` | `event` | `undefined` |
| `DLV - Transaction ID` | `ecommerce.transaction_id` | `undefined` |
| `DLV - Currency` | `ecommerce.currency` | `UAH` |
| `DLV - Value` | `ecommerce.value` | `0` |
| `DLV - Items` | `ecommerce.items` | `undefined` |

#### Checkout Data Variables

| Variable Name | Data Layer Variable Name | Default Value |
|--------------|--------------------------|---------------|
| `DLV - Payment Method` | `payment_method` | `undefined` |
| `DLV - Delivery Method` | `delivery_method` | `undefined` |
| `DLV - Shipping Method` | `ecommerce.shipping_method` | `undefined` |

---

## 5. E-commerce Event Tags

The following 7 events are tracked in this implementation (6 e-commerce + 1 payment tracking):

### Core E-commerce Events (6)

### 5.1 View Item (Product Detail Page)

1. **Create Tag**: Tags → New
2. **Name**: `GA4 - View Item`
3. **Tag Configuration**:
   - Tag Type: **Google Analytics: GA4 Event**
   - Configuration Tag: Select `GA4 Configuration`
   - Event Name: `view_item`
4. **Event Parameters** (Add rows):
   ```
   Parameter Name: currency
   Value: {{DLV - Currency}}

   Parameter Name: value
   Value: {{DLV - Value}}

   Parameter Name: items
   Value: {{DLV - Items}}
   ```
5. **Triggering**:
   - Trigger Type: **Custom Event**
   - Event Name: `view_item`
6. Click **Save**

### 5.2 Add to Cart

1. **Create Tag**: Tags → New
2. **Name**: `GA4 - Add to Cart`
3. **Tag Configuration**:
   - Tag Type: **Google Analytics: GA4 Event**
   - Configuration Tag: Select `GA4 Configuration`
   - Event Name: `add_to_cart`
4. **Event Parameters**:
   ```
   Parameter Name: currency
   Value: {{DLV - Currency}}

   Parameter Name: value
   Value: {{DLV - Value}}

   Parameter Name: items
   Value: {{DLV - Items}}
   ```
5. **Triggering**:
   - Trigger Type: **Custom Event**
   - Event Name: `add_to_cart`
6. Click **Save**

### 5.3 Begin Checkout

1. **Create Tag**: Tags → New
2. **Name**: `GA4 - Begin Checkout`
3. **Tag Configuration**:
   - Tag Type: **Google Analytics: GA4 Event**
   - Configuration Tag: Select `GA4 Configuration`
   - Event Name: `begin_checkout`
4. **Event Parameters**:
   ```
   Parameter Name: currency
   Value: {{DLV - Currency}}

   Parameter Name: value
   Value: {{DLV - Value}}

   Parameter Name: items
   Value: {{DLV - Items}}
   ```
5. **Triggering**:
   - Trigger Type: **Custom Event**
   - Event Name: `begin_checkout`
6. Click **Save**

### 5.4 Add Shipping Info

1. **Create Tag**: Tags → New
2. **Name**: `GA4 - Add Shipping Info`
3. **Tag Configuration**:
   - Tag Type: **Google Analytics: GA4 Event**
   - Configuration Tag: Select `GA4 Configuration`
   - Event Name: `add_shipping_info`
4. **Event Parameters**:
   ```
   Parameter Name: currency
   Value: {{DLV - Currency}}

   Parameter Name: value
   Value: {{DLV - Value}}

   Parameter Name: items
   Value: {{DLV - Items}}

   Parameter Name: shipping_method
   Value: {{DLV - Shipping Method}}
   ```
5. **Triggering**:
   - Trigger Type: **Custom Event**
   - Event Name: `add_shipping_info`
6. Click **Save**

### 5.5 Add Payment Info

1. **Create Tag**: Tags → New
2. **Name**: `GA4 - Add Payment Info`
3. **Tag Configuration**:
   - Tag Type: **Google Analytics: GA4 Event**
   - Configuration Tag: Select `GA4 Configuration`
   - Event Name: `add_payment_info`
4. **Event Parameters**:
   ```
   Parameter Name: currency
   Value: {{DLV - Currency}}

   Parameter Name: value
   Value: {{DLV - Value}}

   Parameter Name: items
   Value: {{DLV - Items}}

   Parameter Name: payment_method
   Value: {{DLV - Payment Method}}
   ```
5. **Triggering**:
   - Trigger Type: **Custom Event**
   - Event Name: `add_payment_info`
6. Click **Save**

### 5.6 Purchase (Most Important!)

1. **Create Tag**: Tags → New
2. **Name**: `GA4 - Purchase`
3. **Tag Configuration**:
   - Tag Type: **Google Analytics: GA4 Event**
   - Configuration Tag: Select `GA4 Configuration`
   - Event Name: `purchase`
4. **Event Parameters**:
   ```
   Parameter Name: transaction_id
   Value: {{DLV - Transaction ID}}

   Parameter Name: currency
   Value: {{DLV - Currency}}

   Parameter Name: value
   Value: {{DLV - Value}}

   Parameter Name: items
   Value: {{DLV - Items}}

   Parameter Name: payment_method
   Value: {{DLV - Payment Method}}

   Parameter Name: delivery_method
   Value: {{DLV - Delivery Method}}
   ```
5. **Triggering**:
   - Trigger Type: **Custom Event**
   - Event Name: `purchase`
6. Click **Save**

### 5.7 Payment Cancelled (NEW) ❌

**Important:** This is a new event for tracking abandoned checkouts.

1. **Create Data Layer Variables** (if not already created):
   - Variable Name: `DLV - Order ID`
   - Data Layer Variable: `order_id`
   - Default Value: `undefined`

   - Variable Name: `DLV - Order Number`
   - Data Layer Variable: `order_number`
   - Default Value: `undefined`

   - Variable Name: `DLV - Order Value`
   - Data Layer Variable: `order_value`
   - Default Value: `0`

2. **Create Tag**: Tags → New
3. **Name**: `GA4 - Payment Cancelled`
4. **Tag Configuration**:
   - Tag Type: **Google Analytics: GA4 Event**
   - Configuration Tag: Select `GA4 Configuration`
   - Event Name: `payment_cancelled`
5. **Event Parameters**:
   ```
   Parameter Name: order_id
   Value: {{DLV - Order ID}}

   Parameter Name: order_number
   Value: {{DLV - Order Number}}

   Parameter Name: payment_method
   Value: {{DLV - Payment Method}}

   Parameter Name: order_value
   Value: {{DLV - Order Value}}

   Parameter Name: currency
   Value: UAH
   ```
6. **Triggering**:
   - Trigger Type: **Custom Event**
   - Event Name: `payment_cancelled`
7. Click **Save**

---

## 6. Testing & Debugging

### Enable GTM Preview Mode

1. In GTM, click **Preview** (top right)
2. Enter your website URL
3. Click **Connect**
4. A new window will open with GTM Debug panel

### Test E-commerce Events

Follow this purchase funnel to test all events:

#### 1. View Item
- Navigate to any product page (e.g., `/product/sofa-modern-grey`)
- **Check**: `view_item` event fires
- **Verify**:
  - Product data in dataLayer
  - `ecommerce.items[0].item_id` exists
  - `ecommerce.items[0].item_name` is correct
  - `ecommerce.value` matches product price

#### 2. Add to Cart
- Click "Add to Cart" button
- **Check**: `add_to_cart` event fires
- **Verify**:
  - Item data includes quantity
  - `ecommerce.value` = price × quantity
  - Color variant is included if selected

#### 3. Begin Checkout
- Go to cart and click "Proceed to Checkout"
- **Check**: `begin_checkout` event fires
- **Verify**:
  - All cart items are in `ecommerce.items` array
  - Total value matches cart total

#### 4. Add Shipping Info
- Complete Step 2 (Delivery Information)
- Click "Next"
- **Check**: `add_shipping_info` event fires
- **Verify**:
  - `shipping_method` parameter is set
  - All items still present

#### 5. Add Payment Info
- Complete Step 3 (Payment Information)
- Click "Next"
- **Check**: `add_payment_info` event fires
- **Verify**:
  - `payment_method` parameter is set
  - All items still present

#### 6. Purchase (IMPORTANT: Only fires for paid orders!)
- Review order and click "Place Order"
- Complete payment successfully
- **Redirects to**: `/order-success` page
- **Check**: `purchase` event fires **on the success page**
- **Verify**:
  - Event fires on `/order-success` URL (not checkout)
  - `transaction_id` is unique
  - Total value is correct
  - All items are included
  - Payment and delivery methods are set
  - `payment_status` should be 'paid'

#### 7. Payment Cancelled (NEW)
- Start checkout process
- Click "Place Order"
- On payment gateway, click "Cancel" or back button
- **Redirects to**: `/payment-cancelled` page
- **Check**: `payment_cancelled` event fires
- **Verify**:
  - Event fires on `/payment-cancelled` URL
  - `order_id` and `order_number` are present
  - `order_value` matches cart total
  - `payment_method` is correct

### Use GA4 DebugView

1. In GA4, go to **Configure** → **DebugView**
2. With Preview Mode enabled, perform actions on your site
3. See events in real-time in DebugView
4. Click on each event to verify parameters

### Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Events not firing | Check if dataLayer is initialized before GTM loads |
| Missing parameters | Verify data layer variable names match exactly |
| Duplicate events | Ensure triggers fire only once per action (already fixed for view_item) |
| Wrong values | Check number formatting (should be numeric, not string) |
| Items array empty | Verify product data structure in tracking calls |
| view_item fires twice | Fixed in code - update from latest branch |
| purchase fires for unpaid orders | Check code - should only fire on /order-success when paid |
| payment_cancelled not firing | Verify payment gateway redirects to /payment-cancelled?orderId=X |

---

## 7. Publishing Container

### Submit Changes

1. In GTM, click **Submit** (top right)
2. **Version Name**: `E-commerce Tracking v2.0`
3. **Version Description**:
   ```
   Complete e-commerce tracking with purchase/cancellation:
   - GA4 configuration tag
   - 6 e-commerce events (view_item, add_to_cart, begin_checkout, add_shipping_info, add_payment_info, purchase)
   - 1 payment tracking event (payment_cancelled)
   - Purchase event fires ONLY for paid orders on /order-success page
   - Payment cancellation tracking on /payment-cancelled page
   - Fixed view_item double-firing bug
   - Data layer variables for all parameters
   - Tested in Preview mode
   ```
4. Click **Publish**

### Set Up Conversions in GA4

1. In GA4, go to **Admin** → **Conversions**
2. Click **New Conversion Event**
3. Enter event name: `purchase`
4. Click **Save**

**Optional Micro-Conversions:**
- `add_to_cart` - Track cart additions
- `begin_checkout` - Track checkout starts

### Monitor After Publishing

1. **Realtime Report**:
   - In GA4, go to **Reports** → **Realtime**
   - Perform test transactions on your live site
   - Verify events appear in Realtime report

2. **E-commerce Report** (available after 24-48 hours):
   - Go to **Monetization** → **Ecommerce purchases**
   - View purchase data, revenue, and items sold
   - Analyze conversion funnel

3. **Debug Issues**:
   - If events don't appear, re-enable Preview mode
   - Check browser console for errors
   - Verify GTM container is published
   - Check that website is using correct GTM ID

---

## Summary of Events Tracked

✅ **7 Active Events**:

**E-commerce Events (6):**
1. `view_item` - Product detail views (fires once per page)
2. `add_to_cart` - Items added to cart
3. `begin_checkout` - Checkout initiated
4. `begin_checkout` - Checkout initiated
5. `add_shipping_info` - Shipping method selected
6. `add_payment_info` - Payment method selected
7. `purchase` - Order completed (**ONLY if payment_status = 'paid'**)

**Payment Tracking (1):**
8. `payment_cancelled` - Payment abandoned/cancelled

❌ **Events NOT Tracked** (intentionally disabled):
- `remove_from_cart` - Not tracked per business requirements
- `view_cart` - Not tracked per business requirements
- Search events - Not tracked per business requirements
- User behavior events (scroll, clicks, etc.) - Not implemented

---

## Purchase Funnel Overview

```
Product Page → Add to Cart → Begin Checkout → Shipping → Payment → Gateway → SUCCESS/CANCEL
   ↓              ↓              ↓              ↓          ↓           ↓           ↓
view_item    add_to_cart   begin_checkout     ↓     add_payment   User      SUCCESS?
(once!)                                        ↓       _info      decides       ↓
                                         add_shipping            YES → purchase ✅
                                            _info                (paid only!)

                                                                 NO → payment_cancelled ❌
```

**Key Points:**
- `view_item` fires **once** per product page (fixed double-firing bug)
- `purchase` fires **ONLY** on `/order-success` when `payment_status = 'paid'`
- `payment_cancelled` fires on `/payment-cancelled` when user abandons payment
- Each step tracks cart value and items for drop-off analysis

---

## Next Steps

1. ✅ Complete GTM setup following this guide
2. ✅ Test all 6 events in Preview mode
3. ✅ Publish GTM container
4. ✅ Set up `purchase` conversion in GA4
5. ✅ Monitor Realtime reports for live data
6. ✅ After 24-48 hours, check E-commerce reports
7. ✅ Create custom funnel exploration in GA4:
   - Go to **Explore** → **Funnel exploration**
   - Add steps: view_item → add_to_cart → begin_checkout → purchase
   - Analyze drop-off rates

---

## Support & Resources

- **GTM Documentation**: https://support.google.com/tagmanager
- **GA4 E-commerce Guide**: https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
- **GA4 Debugging**: https://support.google.com/analytics/answer/7201382

For technical support with this implementation, refer to `GTM_QUICK_REFERENCE.md` in the docs folder.
