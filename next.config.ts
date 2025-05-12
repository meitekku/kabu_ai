/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/:path*",
        destination: "/:path*",
      },
    ];
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  basePath: '',
  trailingSlash: true,
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
};

module.exports = nextConfig;