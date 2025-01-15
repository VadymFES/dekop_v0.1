/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                // This pattern will enable the Image component
                // to load images from the domain `example.com`
                // and `www.example.com`
                protocol: 'https',
                hostname: 'fullhouse.uz'
            },
        ],
    },
};



export default nextConfig;
