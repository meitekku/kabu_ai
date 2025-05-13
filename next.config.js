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
}

module.exports = nextConfig 