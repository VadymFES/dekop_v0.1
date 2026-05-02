# Vercel Blob Storage - Product Image Upload

This document explains the implementation of Vercel Blob Storage for product images in the Dekop e-commerce platform.

## Overview

The system now supports direct image uploads using Vercel Blob Storage, replacing the need for external image hosting services like ImageKit or AWS S3.

### Features

- **Drag-and-drop upload**: Intuitive UI for uploading multiple images
- **Upload progress indicator**: Real-time progress feedback via XMLHttpRequest
- **Image validation**: Automatic validation of file type and size
- **Preview & management**: View, reorder, and delete uploaded images
- **Hybrid support**: Still supports external URL input for legacy images

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Admin Panel                               │
│                    (ProductForm.tsx)                             │
│                           │                                      │
│                    ┌──────▼──────┐                              │
│                    │ ImageUpload │                              │
│                    │  Component  │                              │
│                    └──────┬──────┘                              │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            │ FormData + XMLHttpRequest
                            │ (with progress tracking)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      /api/upload                                 │
│                                                                  │
│  1. Receives FormData with file                                  │
│  2. Validates file type (JPEG, PNG, WebP, GIF)                  │
│  3. Validates file size (max 4MB)                               │
│  4. Uploads to Vercel Blob via put()                            │
│  5. Returns public URL                                          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel Blob Storage                           │
│                                                                  │
│  - Globally distributed CDN                                      │
│  - Automatic optimization                                        │
│  - Public access URLs                                            │
│  - Files stored at: products/{timestamp}-{random}.{ext}         │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
app/
├── api/
│   └── upload/
│       └── route.ts                 # Upload API handler
├── [admin-path-57fyg]/
│   └── products/
│       └── components/
│           ├── ImageUpload.tsx      # Drag-and-drop component
│           ├── ImageUpload.module.css
│           └── ProductForm.tsx      # Updated with ImageUpload
└── ...
```

## Setup Instructions

### 1. Create Blob Store in Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Storage** tab
4. Click **Create Database** → Select **Blob**
5. Name your store (e.g., `dekop-images`)
6. Click **Create**

### 2. Connect Store to Project

1. In the Blob store settings, click **Connect to Project**
2. Select your project and environment (Production/Preview/Development)
3. The `BLOB_READ_WRITE_TOKEN` will be automatically added

### 3. Local Development

Add to your `.env.local`:

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_your_token_here
```

Get the token from Vercel Dashboard → Storage → Your Blob Store → Settings.

### 4. Verify Configuration

The following files should be configured:

**next.config.mjs** - Already updated with:
```javascript
{
    protocol: 'https',
    hostname: '*.blob.vercel-storage.com',
}
```

## API Reference

### POST /api/upload

Handles file uploads using FormData.

**Request:**
- Content-Type: `multipart/form-data`
- Body: FormData with `file` field

**Response (Success):**
```json
{
  "success": true,
  "url": "https://abc123.blob.vercel-storage.com/products/1234567890-abc123.jpg",
  "pathname": "products/1234567890-abc123.jpg"
}
```

**Response (Error):**
```json
{
  "error": "Файл занадто великий. Максимальний розмір: 4MB"
}
```

### DELETE /api/upload

Removes an image from Blob storage.

**Query Parameters:**
- `url` (required): The full Blob URL to delete

**Example:**
```
DELETE /api/upload?url=https://abc123.blob.vercel-storage.com/products/image.jpg
```

**Response:**
```json
{
  "success": true
}
```

## Component Usage

### ImageUpload Component

```tsx
import ImageUpload from './ImageUpload';

// In your form
<ImageUpload
  images={[
    { url: 'https://...', alt: 'Product image', is_primary: true }
  ]}
  onImagesChange={(images) => {
    // Handle updated images array
    console.log(images);
  }}
  maxImages={10}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `images` | `UploadedImage[]` | required | Current images array |
| `onImagesChange` | `(images: UploadedImage[]) => void` | required | Callback when images change |
| `maxImages` | `number` | 10 | Maximum allowed images |

### UploadedImage Type

```typescript
interface UploadedImage {
  url: string;        // Full URL to the image
  alt: string;        // Alt text for accessibility
  is_primary: boolean; // Whether this is the main product image
}
```

## Validation Rules

| Rule | Value |
|------|-------|
| Allowed formats | JPEG, PNG, WebP, GIF |
| Maximum file size | 4 MB |
| Maximum images per product | 10 |

## Pricing

Vercel Blob pricing (as of 2025):

| Tier | Storage | Bandwidth | Price |
|------|---------|-----------|-------|
| Hobby | 1 GB | 1 GB/month | Free |
| Pro | 5 GB | 100 GB/month | Included |
| Additional | - | - | $0.03/GB storage, $0.15/GB bandwidth |

**Note:** Client uploads have no data transfer charges for uploads - only downloads count against bandwidth.

## Troubleshooting

### Common Issues

#### "BLOB_READ_WRITE_TOKEN is not set"

**Solution:** Add the token to your `.env.local` file or connect the Blob store in Vercel Dashboard.

#### Upload fails with "Непідтримуваний формат файлу"

**Solution:** Ensure you're uploading one of the allowed formats: JPEG, PNG, WebP, or GIF.

#### Images don't display after upload

**Solution:** Check that `*.blob.vercel-storage.com` is in your `next.config.mjs` remotePatterns.

#### "Request Entity Too Large" error

**Solution:** The file exceeds 4MB. Compress the image or use a smaller resolution.

## Migration from External URLs

The system maintains backward compatibility with external image URLs. Existing products with ImageKit, S3, or other external URLs will continue to work.

To migrate existing images to Vercel Blob:
1. Download the images from the external source
2. Re-upload using the new ImageUpload component
3. The old URLs will be replaced with new Blob URLs
4. Delete old images from the external service (optional)

## Security

- **Token-based authentication**: Client uploads use short-lived tokens
- **Server-side validation**: File type and size validated before token generation
- **CORS protection**: Only your domain can request upload tokens
- **Signed URLs**: All Blob operations use signed requests

## References

- [Vercel Blob Documentation](https://vercel.com/docs/vercel-blob)
- [Client Uploads Guide](https://vercel.com/docs/vercel-blob/client-upload)
- [@vercel/blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk)
- [Pricing Details](https://vercel.com/docs/vercel-blob#pricing)
