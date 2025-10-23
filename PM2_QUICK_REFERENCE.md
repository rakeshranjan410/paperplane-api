# PM2 Quick Reference Guide

Quick reference for managing the Paperplane API with PM2.

## Essential Commands

### Starting the Application

```bash
# Production mode (recommended for EC2)
npm run pm2:start

# Development mode
npm run pm2:dev

# Direct PM2 commands
pm2 start ecosystem.config.cjs --env production
pm2 start ecosystem.config.cjs --env development
```

### Viewing Status & Monitoring

```bash
# View all PM2 processes
npm run pm2:status
pm2 status
pm2 list

# View detailed info
pm2 describe paperplane-api

# Real-time monitoring
npm run pm2:monit
pm2 monit
```

### Viewing Logs

```bash
# Stream all logs
npm run pm2:logs
pm2 logs paperplane-api

# View last 100 lines
pm2 logs paperplane-api --lines 100

# View only errors
pm2 logs paperplane-api --err

# Clear logs
pm2 flush
```

### Restarting

```bash
# Hard restart
npm run pm2:restart
pm2 restart paperplane-api

# Zero-downtime reload
npm run pm2:reload
pm2 reload paperplane-api
```

### Stopping & Deleting

```bash
# Stop the application
npm run pm2:stop
pm2 stop paperplane-api

# Delete from PM2
npm run pm2:delete
pm2 delete paperplane-api
```

## Auto-Start on Reboot

```bash
# Generate startup script
pm2 startup

# Save current processes
pm2 save

# Restore saved processes
pm2 resurrect
```

## Updating the Application

### Automated Deployment (Recommended)
```bash
cd ~/paperplane-api
./deploy.sh
```

This script pulls latest changes, reinstalls dependencies, and restarts PM2.

### Manual Update
```bash
cd ~/paperplane-api
git pull origin main
npm install --production
pm2 restart paperplane-api
```

### Zero-Downtime Update
```bash
cd ~/paperplane-api
git pull origin main
npm install --production
pm2 reload paperplane-api
```

## Troubleshooting

### Check Health
```bash
curl http://localhost:4000/health
```

### Debug Issues
```bash
# View logs
pm2 logs paperplane-api --lines 200

# Check details
pm2 describe paperplane-api

# Monitor resources
pm2 monit
```

### Port Already in Use
```bash
sudo lsof -i :4000
kill -9 <PID>
```

### PM2 Not Starting
```bash
pm2 kill
pm2 start ecosystem.config.js --env production
```

## Log Rotation

```bash
# Install log rotation
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

## Notes

- The ecosystem file uses `.cjs` extension because the project uses ES modules (`"type": "module"` in package.json)
- PM2 ecosystem files must be CommonJS format

## Resources

- PM2 Documentation: https://pm2.keymetrics.io/docs/
- Full deployment guide: See EC2_DEPLOYMENT.md
