/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['133.130.102.77'],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['133.130.102.77:3000'],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.output.assetModuleFilename = 'static/[hash][ext]';
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/var/www/kabu_ai/public/uploads/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig 