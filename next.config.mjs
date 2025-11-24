/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
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

    // Security Headers
    async headers() {
        return [
            {
                // Apply security headers to all routes
                source: '/(.*)',
                headers: [
                    {
                        // HTTP Strict Transport Security (HSTS)
                        // Forces HTTPS for 1 year, including all subdomains
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains'
                    },
                    {
                        // X-Frame-Options
                        // Prevents clickjacking attacks by disallowing iframe embedding
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN'
                    },
                    {
                        // X-Content-Type-Options
                        // Prevents MIME type sniffing
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        // X-DNS-Prefetch-Control
                        // Controls browser DNS prefetching
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        // Referrer-Policy
                        // Controls how much referrer information is sent
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    },
                    {
                        // Permissions-Policy
                        // Controls which browser features can be used
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
                    },
                    {
                        // X-XSS-Protection
                        // Legacy XSS protection (modern browsers use CSP instead)
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    {
                        // Content-Security-Policy
                        // Comprehensive protection against XSS, clickjacking, and other code injection attacks
                        key: 'Content-Security-Policy',
                        value: [
                            // Default: only allow same origin
                            "default-src 'self'",
                            // Scripts: allow self and whitelisted external scripts only
                            "script-src 'self' https://www.googletagmanager.com https://va.vercel-scripts.com https://www.liqpay.ua https://api.monobank.ua https://pay.google.com",
                            // Styles: allow self, inline styles, Google Fonts, and Leaflet CDN
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
                            // Images: allow self, data URIs, HTTPS images, and configured remote patterns
                            "img-src 'self' data: https: blob:",
                            // Fonts: allow self, Google Fonts, and Leaflet CDN
                            "font-src 'self' data: https://fonts.gstatic.com https://unpkg.com",
                            // Connect: allow self, API endpoints, and analytics
                            "connect-src 'self' https://api.liqpay.ua https://www.liqpay.ua https://api.monobank.ua https://va.vercel-scripts.com https://vitals.vercel-insights.com",
                            // Frame: allow payment providers
                            "frame-src 'self' https://www.liqpay.ua https://pay.google.com",
                            // Object: disallow plugins
                            "object-src 'none'",
                            // Base: restrict base tag
                            "base-uri 'self'",
                            // Form: allow self and payment providers
                            "form-action 'self' https://www.liqpay.ua",
                            // Upgrade insecure requests to HTTPS
                            "upgrade-insecure-requests"
                        ].join('; ')
                    }
                ],
            },
            {
                // Specific headers for API routes (webhooks)
                source: '/api/webhooks/:path*',
                headers: [
                    {
                        key: 'X-Robots-Tag',
                        value: 'noindex, nofollow'
                    },
                    {
                        key: 'Cache-Control',
                        value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
                    }
                ],
            }
        ];
    },
};

export default nextConfig;
