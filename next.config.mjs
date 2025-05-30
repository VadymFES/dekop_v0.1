/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    images: {
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
        ],
    },
};

export default nextConfig;
