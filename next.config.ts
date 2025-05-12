/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    TZ: "Asia/Tokyo",
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: 'http://localhost:3000/:path*',
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