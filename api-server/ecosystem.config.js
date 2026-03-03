// api-server/ecosystem.config.js
// PM2 process manager configuration for the AiOC API Server.
// Usage on Instance B:
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup

module.exports = {
  apps: [
    {
      name:         "aioc-api-server",
      script:       "dist/index.js",
      cwd:          __dirname,
      instances:    1,           // single instance; scale with cluster if needed
      exec_mode:    "fork",
      autorestart:  true,
      watch:        false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT:     "4000",
      },
      error_file:  "logs/err.log",
      out_file:    "logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
