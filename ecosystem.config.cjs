/* global module */

module.exports = {
  apps: [
    {
      name: 'kabu_ai',
      cwd: '/var/www/kabu_ai',
      script: '.next/standalone/server.js',
      exec_mode: 'cluster',
      instances: 2,
      max_memory_restart: '1G',
      kill_timeout: 10000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        CHROME_BINARY_PATH: '/usr/bin/google-chrome-stable',
      },
    },
  ],
};
