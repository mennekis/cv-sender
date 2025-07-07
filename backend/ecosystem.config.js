// ecosystem.config.js
module.exports = {
   apps: [
      {
         name: "seafarer-backend",
         script: "server.js", // Точка входа в бэкенд
         watch: false,
         autorestart: true,
         max_restarts: 5,
         env: {
            NODE_ENV: "production",
            NODE_EXTRA_CA_CERTS: "/etc/ssl/certs/ca-certificates.crt",
         },
         error_file: "./logs/err.log",
         out_file: "./logs/out.log",
         log_file: "./logs/combined.log",
         time: true,
      },
   ],
};
