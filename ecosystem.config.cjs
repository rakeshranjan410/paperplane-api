/**
 * PM2 Ecosystem Configuration
 * 
 * This configuration file manages the Node.js application with PM2 on EC2.
 * It provides different environments (production, development) and handles
 * auto-restart, logging, and clustering.
 * 
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 start ecosystem.config.js --env development
 */

module.exports = {
  apps: [{
    // Application name
    name: 'paperplane-api',
    
    // Script to run
    script: './src/server.js',
    
    // Node.js interpreter (use 'node' for ES modules)
    interpreter: 'node',
    
    // Instances to run (0 = use all available CPU cores, 1 = single instance)
    // Recommended: 1 for API servers with database connections
    instances: 1,
    
    // Execution mode: 'cluster' or 'fork'
    // Use 'fork' for ES modules and MongoDB connections
    exec_mode: 'fork',
    
    // Watch for file changes and auto-restart (disable in production)
    watch: false,
    
    // Maximum memory threshold before auto-restart (1GB)
    max_memory_restart: '1G',
    
    // Auto-restart if app crashes
    autorestart: true,
    
    // Maximum number of restarts within 1 minute before giving up
    max_restarts: 10,
    
    // Minimum uptime before considering restart stable
    min_uptime: '10s',
    
    // Time to wait before force-killing the app on restart
    kill_timeout: 5000,
    
    // Time to wait before restarting a crashed app
    restart_delay: 4000,
    
    // Environment variables for production
    env_production: {
      NODE_ENV: 'production',
      HOST_ENV: 'production',
      PORT: 4000
    },
    
    // Environment variables for development
    env_development: {
      NODE_ENV: 'development',
      HOST_ENV: 'local',
      PORT: 4000
    },
    
    // Environment variables for debug
    env_debug: {
      NODE_ENV: 'development',
      HOST_ENV: 'local',
      PORT: 4000,
      NODE_ENV_DEBUG: 'true'
    },
    
    // Logging configuration
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    
    // Merge logs from all instances (if using cluster mode)
    merge_logs: true,
    
    // Log date format
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Rotate logs when they reach this size
    max_size: '10M',
    
    // Keep last 7 rotated logs
    retain: 7,
    
    // Compress rotated logs
    compress: true,
  }]
};
