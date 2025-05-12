import { NextConfig } from 'next'
import { IncomingMessage, ServerResponse } from 'http'

const nextConfig: NextConfig = {
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
        source: '/_next/static/:path*',
        destination: 'http://133.130.102.77:3000/_next/static/:path*',
      },
      {
        source: '/static/:path*',
        destination: 'http://133.130.102.77:3000/static/:path*',
      },
      {
        source: '/:path*',
        destination: 'http://133.130.102.77:3000/:path*',
      },
    ]
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
  httpAgentOptions: {
    keepAlive: true,
  },
  proxy: {
    '/api': {
      target: 'http://133.130.102.77:3000',
      changeOrigin: true,
      secure: false,
      timeout: 30000,
      proxyTimeout: 30000,
      onError: (err: Error, req: IncomingMessage, res: ServerResponse) => {
        console.error('Proxy Error:', err);
        res.writeHead(500, {
          'Content-Type': 'text/plain',
        });
        res.end('Proxy Error');
      },
    },
  },
}

export default nextConfig