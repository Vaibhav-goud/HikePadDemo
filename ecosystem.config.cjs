module.exports = {
    apps: [
        {
            name: 'hike-sync-service',
            cwd: './firebase-mongo-sync',
            script: 'sync.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '200M',
            env: {
                NODE_ENV: 'production',
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: './logs/error.log',
            out_file: './logs/out.log',
        },
        {
            name: 'hike-backend',
            cwd: './backend',
            script: 'server.js',
            instances: 1,
            autorestart: true,
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
            }
        },
        {
            name: 'hike-frontend',
            script: 'cmd.exe',
            args: '/c npm run dev -- --port 8080 --host',
            instances: 1,
            autorestart: true,
        }
    ],
};
