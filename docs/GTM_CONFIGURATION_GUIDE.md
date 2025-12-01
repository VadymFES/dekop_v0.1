# Google Tag Manager Configuration Guide

Complete step-by-step guide for configuring Google Tag Manager (GTM) with enhanced e-commerce tracking for Dekop Furniture Enterprise.

## Table of Contents

1. [GTM Account Setup](#1-gtm-account-setup)
2. [Install GTM Container](#2-install-gtm-container)
3. [Configure GA4 Property](#3-configure-ga4-property)
4. [E-commerce Data Layer Variables](#4-e-commerce-data-layer-variables)
5. [Enhanced E-commerce Tags](#5-enhanced-e-commerce-tags)
6. [Conversion Tracking](#6-conversion-tracking)
7. [Search Analytics](#7-search-analytics)
8. [User Behavior Tracking](#8-user-behavior-tracking)
9. [Testing & Debugging](#9-testing--debugging)
10. [Publishing Container](#10-publishing-container)

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
   - ✅ Click Element
   - ✅ Click Text
   - ✅ Click URL

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
| `DLV - Item List Name` | `ecommerce.item_list_name` | `undefined` |
| `DLV - Search Term` | `search_term` | `undefined` |
| `DLV - Results Count` | `results_count` | `0` |

#### User Data Variables

| Variable Name | Data Layer Variable Name | Default Value |
|--------------|--------------------------|---------------|
| `DLV - Payment Method` | `payment_method` | `undefined` |
| `DLV - Delivery Method` | `delivery_method` | `undefined` |
| `DLV - Shipping Method` | `ecommerce.shipping_method` | `undefined` |

---

## 5. Enhanced E-commerce Tags

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

### 5.3 Remove from Cart

1. **Create Tag**: Tags → New
2. **Name**: `GA4 - Remove from Cart`
3. **Tag Configuration**:
   - Tag Type: **Google Analytics: GA4 Event**
   - Configuration Tag: Select `GA4 Configuration`
   - Event Name: `remove_from_cart`
4. **Event Parameters**: Same as Add to Cart
5. **Triggering**:
   - Trigger Type: **Custom Event**
   - Event Name: `remove_from_cart`
6. Click **Save**

### 5.4 View Cart

1. **Create Tag**: Tags → New
2. **Name**: `GA4 - View Cart`
3. **Tag Configuration**:
   - Tag Type: **Google Analytics: GA4 Event**
   - Configuration Tag: Select `GA4 Configuration`
   - Event Name: `view_cart`
4. **Event Parameters**: Same as above
5. **Triggering**:
   - Trigger Type: **Custom Event**
   - Event Name: `view_cart`
6. Click **Save**

### 5.5 Begin Checkout

1. **Create Tag**: Tags → New
2. **Name**: `GA4 - Begin Checkout`
3. **Tag Configuration**:
   - Tag Type: **Google Analytics: GA4 Event**
   - Configuration Tag: Select `GA4 Configuration`
   - Event Name: `begin_checkout`
4. **Event Parameters**: Same as above
5. **Triggering**:
   - Trigger Type: **Custom Event**
   - Event Name: `begin_checkout`
6. Click **Save**

### 5.6 Add Shipping Info

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

### 5.7 Add Payment Info

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

### 5.8 Purchase (Most Important!)

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

---

## 6. Conversion Tracking

### Set Up Purchase Conversion

1. In GA4, go to **Admin** → **Conversions**
2. Click **New Conversion Event**
3. Enter event name: `purchase`
4. Click **Save**

### Optional: Set Up Micro-Conversions

Create additional conversions for:
- `add_to_cart` - Users adding items to cart
- `begin_checkout` - Users starting checkout
- `search` - Users performing searches

---

## 7. Search Analytics

### 7.1 Search Event Tag

1. **Create Tag**: Tags → New
2. **Name**: `GA4 - Search`
3. **Tag Configuration**:
   - Tag Type: **Google Analytics: GA4 Event**
   - Configuration Tag: Select `GA4 Configuration`
   - Event Name: `search`
4. **Event Parameters**:
   ```
   Parameter Name: search_term
   Value: {{DLV - Search Term}}
   ```
5. **Triggering**:
   - Trigger Type: **Custom Event**
   - Event Name: `search_submitted`
6. Click **Save**

### 7.2 View Search Results Tag

1. **Create Tag**: Tags → New
2. **Name**: `GA4 - View Search Results`
3. **Tag Configuration**:
   - Tag Type: **Google Analytics: GA4 Event**
   - Configuration Tag: Select `GA4 Configuration`
   - Event Name: `view_search_results`
4. **Event Parameters**:
   ```
   Parameter Name: search_term
   Value: {{DLV - Search Term}}

   Parameter Name: results_count
   Value: {{DLV - Results Count}}
   ```
5. **Triggering**:
   - Trigger Type: **Custom Event**
   - Event Name: `view_search_results`
6. Click **Save**

---

## 8. User Behavior Tracking

### 8.1 Scroll Depth Tracking

1. **Create Trigger**: Triggers → New
2. **Name**: `Scroll Depth - 25%, 50%, 75%, 90%`
3. **Trigger Configuration**:
   - Trigger Type: **Scroll Depth**
   - Vertical Scroll Depths: `25,50,75,90` (percentages)
   - Fires On: **All Pages**
4. Click **Save**

5. **Create Tag**: Tags → New
6. **Name**: `GA4 - Scroll Depth`
7. **Tag Configuration**:
   - Tag Type: **Google Analytics: GA4 Event**
   - Configuration Tag: Select `GA4 Configuration`
   - Event Name: `scroll`
8. **Event Parameters**:
   ```
   Parameter Name: percent_scrolled
   Value: {{Scroll Depth Threshold}}
   ```
9. **Triggering**: Select `Scroll Depth - 25%, 50%, 75%, 90%`
10. Click **Save**

### 8.2 Outbound Link Tracking

1. **Create Variable**: Variables → New
2. **Name**: `Outbound Link Check`
3. **Variable Configuration**:
   - Variable Type: **Custom JavaScript**
   - Custom JavaScript:
   ```javascript
   function() {
     var url = {{Click URL}};
     var hostname = {{Page Hostname}};
     return url && url.indexOf(hostname) === -1;
   }
   ```
4. Click **Save**

5. **Create Trigger**: Triggers → New
6. **Name**: `Outbound Link Click`
7. **Trigger Configuration**:
   - Trigger Type: **Click - All Elements**
   - Fires On: **Some Clicks**
   - Condition: `Outbound Link Check` equals `true`
8. Click **Save**

9. **Create Tag**: Tags → New
10. **Name**: `GA4 - Outbound Click`
11. **Tag Configuration**:
    - Tag Type: **Google Analytics: GA4 Event**
    - Configuration Tag: Select `GA4 Configuration`
    - Event Name: `click`
12. **Event Parameters**:
    ```
    Parameter Name: link_domain
    Value: {{Click URL}}

    Parameter Name: link_text
    Value: {{Click Text}}

    Parameter Name: outbound
    Value: true
    ```
13. **Triggering**: Select `Outbound Link Click`
14. Click **Save**

### 8.3 File Download Tracking

1. **Create Trigger**: Triggers → New
2. **Name**: `File Download - PDF`
3. **Trigger Configuration**:
   - Trigger Type: **Click - All Elements**
   - Fires On: **Some Clicks**
   - Condition: `Click URL` matches RegEx `\.pdf$`
4. Click **Save**

5. **Create Tag**: Tags → New
6. **Name**: `GA4 - File Download`
7. **Tag Configuration**:
   - Tag Type: **Google Analytics: GA4 Event**
   - Configuration Tag: Select `GA4 Configuration`
   - Event Name: `file_download`
8. **Event Parameters**:
   ```
   Parameter Name: file_name
   Value: {{Click URL}}

   Parameter Name: link_text
   Value: {{Click Text}}
   ```
9. **Triggering**: Select `File Download - PDF`
10. Click **Save**

### 8.4 Form Tracking

1. **Create Trigger**: Triggers → New
2. **Name**: `Form Submission - All Forms`
3. **Trigger Configuration**:
   - Trigger Type: **Form Submission**
   - Check validation: **False**
   - Fires On: **All Forms**
4. Click **Save**

5. **Create Tag**: Tags → New
6. **Name**: `GA4 - Form Submission`
7. **Tag Configuration**:
   - Tag Type: **Google Analytics: GA4 Event**
   - Configuration Tag: Select `GA4 Configuration`
   - Event Name: `form_submit`
8. **Event Parameters**:
   ```
   Parameter Name: form_id
   Value: {{Form ID}}

   Parameter Name: form_classes
   Value: {{Form Classes}}
   ```
9. **Triggering**: Select `Form Submission - All Forms`
10. Click **Save**

---

## 9. Testing & Debugging

### Enable GTM Preview Mode

1. In GTM, click **Preview** (top right)
2. Enter your website URL
3. Click **Connect**
4. A new window will open with GTM Debug panel

### Test E-commerce Events

1. **View Item**: Navigate to a product page
   - Check if `view_item` event fires
   - Verify product data in dataLayer

2. **Add to Cart**: Click "Add to Cart" button
   - Check if `add_to_cart` event fires
   - Verify item data and price

3. **View Cart**: Go to cart page
   - Check if `view_cart` event fires
   - Verify all cart items

4. **Begin Checkout**: Click "Proceed to Checkout"
   - Check if `begin_checkout` event fires

5. **Purchase**: Complete a test order
   - Check if `purchase` event fires
   - Verify transaction_id and total value

### Use GA4 DebugView

1. In GA4, go to **Configure** → **DebugView**
2. With Preview Mode enabled, perform actions on your site
3. See events in real-time in DebugView
4. Verify all parameters are correct

### Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Events not firing | Check if dataLayer is initialized before GTM loads |
| Missing parameters | Verify data layer variable names match exactly |
| Duplicate events | Ensure triggers fire only once per action |
| Wrong values | Check number formatting (should be numeric, not string) |

---

## 10. Publishing Container

### Submit Changes

1. In GTM, click **Submit** (top right)
2. **Version Name**: `Enhanced E-commerce Setup v1.0`
3. **Version Description**:
   ```
   Initial setup with:
   - GA4 configuration
   - Enhanced e-commerce tracking (view_item, add_to_cart, purchase, etc.)
   - Search analytics
   - User behavior tracking (scroll, outbound links, file downloads)
   ```
4. Click **Publish**

### Monitor After Publishing

1. In GA4, go to **Reports** → **Realtime**
2. Perform test transactions on your live site
3. Verify events appear in Realtime report
4. Check **Monetization** → **Ecommerce purchases** report (data appears within 24-48 hours)

---

## Summary of Events Tracked

✅ **E-commerce Events**:
- `view_item` - Product detail views
- `view_item_list` - Product list views (catalog, category)
- `select_item` - Product clicks from lists
- `add_to_cart` - Items added to cart
- `remove_from_cart` - Items removed from cart
- `view_cart` - Cart page views
- `begin_checkout` - Checkout initiated
- `add_shipping_info` - Shipping method selected
- `add_payment_info` - Payment method selected
- `purchase` - Order completed

✅ **Search Events**:
- `search` - Search performed
- `view_search_results` - Search results viewed

✅ **User Behavior Events**:
- `scroll` - Scroll depth (25%, 50%, 75%, 90%)
- `click` - Outbound link clicks
- `file_download` - File downloads (PDF, etc.)
- `form_submit` - Form submissions

---

## Next Steps

1. ✅ Complete GTM setup following this guide
2. ✅ Enable Enhanced E-commerce in GA4 (Admin → Data Display → Enable)
3. ✅ Create custom reports in GA4 for e-commerce analysis
4. ✅ Set up audiences based on user behavior
5. ✅ Configure remarketing lists for Google Ads
6. ✅ Set up automated alerts for conversion tracking

---

## Support & Resources

- **GTM Documentation**: https://support.google.com/tagmanager
- **GA4 E-commerce Guide**: https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
- **GTM Community**: https://www.en.advertisercommunity.com/t5/Google-Tag-Manager/ct-p/Google-Tag-Manager

For technical support with this implementation, check the codebase documentation or consult with your development team.
