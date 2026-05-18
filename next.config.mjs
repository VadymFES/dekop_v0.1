/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    allowedDevOrigins: ['192.168.252.194'],
    serverActions: {
        bodySizeLimit: '4mb',
    },
    images: {
        formats: ['image/avif', 'image/webp'],
        qualities: [40, 60, 75, 80, 85],
        deviceSizes: [640, 750, 828, 1080, 1200, 1280, 1536],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'fullhouse.uz', // Your other domain
            },
            {
                protocol: 'https',
                hostname: 'drive.google.com', // Allow Google Drive images
            },
            {
                protocol: 'https',
                hostname: 'tk.ua', // Allow Google images
            },
            {
                protocol: 'https',
                hostname: 'dekor-1.s3.eu-north-1.amazonaws.com', // Allow AWS images
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com', // Allow Unsplash images
            },
            {
                protocol: 'https',
                hostname: 'images.pexels.com', // Allow Pixabay images
            },
            {
                protocol: 'https',
                hostname: 'ik.imagekit.io', // Allow ImageKit images
            },
            {
                protocol: 'https',
                hostname: '*.blob.vercel-storage.com', // Vercel Blob Storage
            },
        ],
    },

    // ⚠️ REMOVED: async headers() function (CSP logic moved to middleware)
};

export default nextConfig;