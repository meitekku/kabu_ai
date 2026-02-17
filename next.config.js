/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  output: 'standalone',
  serverExternalPackages: ['mysql2', 'twitter-api-v2'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kabu-ai.jp',
      },
      {
        protocol: 'http',
        hostname: '133.130.102.77',
      }
    ],
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
  async headers() {
    return [
      {
        source: '/api/routes/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        // /uploads/* へのアクセスを /api/routes/* にリダイレクト
        source: '/uploads/:path*',
        destination: '/api/routes/:path*',
      },
    ];
  },
  async redirects() {
    return [
      // 旧URL互換: /kabu_ai/* → /*
      {
        source: '/kabu_ai/:path*',
        destination: '/:path*',
        permanent: true,
      },
      // 記事詳細: /:code/news/article/:id → /stocks/:code/news/:id
      {
        source: '/:code(\\d{4})/news/article/:id(\\d+)',
        destination: '/stocks/:code/news/:id',
        permanent: true,
      },
      // 記事リスト: /:code/news/article/list → /stocks/:code/news/list
      {
        source: '/:code(\\d{4})/news/article/list',
        destination: '/stocks/:code/news/list',
        permanent: true,
      },
      // 予測: /:code/news/predict → /stocks/:code/predict
      {
        source: '/:code(\\d{4})/news/predict',
        destination: '/stocks/:code/predict',
        permanent: true,
      },
      // バリュエーション: /:code/news/valuation → /stocks/:code/valuation
      {
        source: '/:code(\\d{4})/news/valuation',
        destination: '/stocks/:code/valuation',
        permanent: true,
      },
      // ニュース一覧: /:code/news → /stocks/:code/news
      {
        source: '/:code(\\d{4})/news',
        destination: '/stocks/:code/news',
        permanent: true,
      },
      // 最新ニュース: /news/list/latest → /news/latest
      {
        source: '/news/list/latest',
        destination: '/news/latest',
        permanent: true,
      },
      // "all"コードの記事: /all/news/article/:id → /stocks/all/news/:id
      {
        source: '/all/news/article/:id(\\d+)',
        destination: '/stocks/all/news/:id',
        permanent: true,
      },
    ];
  },
  assetPrefix: '',
  distDir: '.next',
  poweredByHeader: false,
  generateEtags: false,
  compress: true,
  reactStrictMode: true,
}

module.exports = nextConfig
