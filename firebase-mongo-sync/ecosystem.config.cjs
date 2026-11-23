module.exports = {
    apps: [
        {
            name: 'firebase-mongo-sync',
            script: 'sync.js',
            watch: false,
            env: {
                NODE_ENV: 'production',
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: 'logs/error.log',
            out_file: 'logs/out.log',
            merge_logs: true,
            autorestart: true,
            restart_delay: 4000,
        },
    ],
};
