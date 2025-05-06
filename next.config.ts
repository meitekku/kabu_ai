/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    TZ: "Asia/Tokyo",
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lnxr7mfpeliq2or9.public.blob.vercel-storage.com',
        port: '',
        pathname: '/post_images/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/:path*",
        destination: "/:path*",
      },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
      bodySizeLimit: '2mb'
    },
  },
  output: 'standalone',
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ]
  },
};

module.exports = nextConfig;