module.exports = {
  apps: [
    {
      name: 'convoai-main',
      script: './server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/convoai/error.log',
      out_file: '/var/log/convoai/out.log',
      log_file: '/var/log/convoai/combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      // Auto restart if crash
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};