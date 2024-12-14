module.exports = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              value: 'http://kabu-ai.jp/',
            },
          ],
          destination: '/:path*',
        },
      ],
    }
  },
}