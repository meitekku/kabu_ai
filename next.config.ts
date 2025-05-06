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
    serverActions: true,
  },
  output: 'standalone',
};

module.exports = nextConfig;