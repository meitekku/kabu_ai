/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    TZ: "Asia/Tokyo",
  },
  async rewrites() {
    return [
      {
        source: "/:path*",
        destination: "/:path*",
      },
    ];
  },
};

module.exports = nextConfig;