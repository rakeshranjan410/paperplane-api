# EC2 Deployment Guide with PM2

This guide walks you through deploying the Paperplane API on AWS EC2 using PM2 for process management.

## Prerequisites

- AWS EC2 instance running (Ubuntu/Amazon Linux recommended)
- SSH access to your EC2 instance
- Node.js v18+ installed on EC2
- `.env` file configured with production credentials

## Step 1: Connect to EC2

```bash
ssh -i your-key.pem ec2-user@your-ec2-public-ip
```

## Step 2: Install Node.js (if not installed)

### For Amazon Linux 2023 / Amazon Linux 2:
```bash
# Install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

### For Ubuntu:
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

## Step 3: Install PM2 Globally

```bash
sudo npm install -g pm2
pm2 --version
```

## Step 4: Clone or Upload Your Code

### Option A: Using Git
```bash
# Install git if not available
sudo yum install git -y  # Amazon Linux
# OR
sudo apt-get install git -y  # Ubuntu

# Clone your repository
cd ~
git clone https://github.com/your-username/paperplane-api.git
cd paperplane-api
```

### Option B: Using SCP (from your local machine)
```bash
# From your local machine
scp -i your-key.pem -r /path/to/paperplane-api ec2-user@your-ec2-ip:~/
```

## Step 5: Install Dependencies

```bash
cd ~/paperplane-api
npm install --production
```

## Step 6: Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add your production environment variables:
```env
HOST_ENV=production
PORT=4000
NODE_ENV=production

FRONTEND_URL_LOCAL=http://localhost:3000
FRONTEND_URL_PROD=http://your-frontend-ip:3000

AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=paperplane-diagrams

MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DATABASE=question_bank
MONGODB_COLLECTION=questions
```

Save and exit (Ctrl+X, Y, Enter)

## Step 7: Create Logs Directory

```bash
mkdir -p logs
```

## Step 8: Start Application with PM2

```bash
# Start in production mode
npm run pm2:start

# OR directly with pm2
pm2 start ecosystem.config.cjs --env production
```

## Step 9: Configure EC2 Security Group

Ensure your EC2 security group allows:
- **Inbound Rule**: TCP port 4000 from your frontend IP or 0.0.0.0/0 (less secure)
- **Inbound Rule**: TCP port 22 for SSH access

### Update Security Group:
1. Go to AWS EC2 Console
2. Select your instance
3. Go to Security → Security Groups
4. Edit Inbound Rules
5. Add rule: Custom TCP, Port 4000, Source: 0.0.0.0/0 (or specific IP)

## Step 10: Set PM2 to Auto-Start on Reboot

```bash
# Generate startup script
pm2 startup

# This will output a command like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user

# Copy and run that command

# Save current PM2 process list
pm2 save
```

## PM2 Management Commands

### Check Status
```bash
pm2 status
npm run pm2:status
```

### View Logs
```bash
pm2 logs paperplane-api
npm run pm2:logs

# View last 100 lines
pm2 logs paperplane-api --lines 100

# View only errors
pm2 logs paperplane-api --err
```

### Monitor in Real-Time
```bash
pm2 monit
npm run pm2:monit
```

### Restart Application
```bash
pm2 restart paperplane-api
npm run pm2:restart
```

### Reload (Zero-Downtime Restart)
```bash
pm2 reload paperplane-api
npm run pm2:reload
```

### Stop Application
```bash
pm2 stop paperplane-api
npm run pm2:stop
```

### Delete from PM2
```bash
pm2 delete paperplane-api
npm run pm2:delete
```

## Step 11: Test Your API

```bash
# From EC2 instance
curl http://localhost:4000/health

# From your local machine
curl http://your-ec2-public-ip:4000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Markdown Q&A API is running",
  "timestamp": "2025-10-23T07:06:42.000Z",
  "environment": "production"
}
```

## Updating Your Application

### Automated Deployment (Recommended)

Use the included deployment script for a complete update:

```bash
cd ~/paperplane-api
./deploy.sh
```

This script automatically:
- Pulls latest changes from main
- Reinstalls dependencies
- Stops all PM2 processes
- Restarts the server in production mode
- Runs health checks
- Saves PM2 configuration

### Manual Update

#### Pull Latest Changes
```bash
cd ~/paperplane-api
git pull origin main
npm install --production
pm2 reload paperplane-api
```

#### Or with Zero-Downtime Deployment
```bash
cd ~/paperplane-api
git pull origin main
npm install --production
npm run pm2:reload
```

## Troubleshooting

### Check PM2 Logs
```bash
pm2 logs paperplane-api --lines 50
```

### Check if Port 4000 is in Use
```bash
sudo lsof -i :4000
sudo netstat -tulpn | grep 4000
```

### Restart PM2 Daemon
```bash
pm2 kill
pm2 resurrect
```

### Check PM2 Process
```bash
pm2 describe paperplane-api
```

### View System Resources
```bash
pm2 monit
# OR
htop
```

## Log Rotation

PM2 automatically rotates logs based on ecosystem.config.js:
- Max size: 10MB
- Retention: 7 files
- Compression: Enabled

To manually rotate:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

## Monitoring and Alerts

### PM2 Plus (Optional - Cloud Monitoring)
```bash
# Sign up at https://pm2.io
pm2 link your-secret-key your-public-key
```

## Backup and Recovery

### Save PM2 Configuration
```bash
pm2 save
```

### Restore PM2 Configuration
```bash
pm2 resurrect
```

## Security Best Practices

1. **Never commit .env file** - Keep credentials secure
2. **Use IAM roles** - Attach IAM role to EC2 for AWS access instead of hardcoding keys
3. **Restrict Security Group** - Only allow necessary IPs
4. **Keep Node.js updated** - Regularly update Node.js and npm packages
5. **Use HTTPS** - Consider using Nginx as reverse proxy with SSL

## Next Steps

- Set up Nginx as reverse proxy (recommended)
- Configure domain name with Route 53
- Add SSL certificate with Let's Encrypt
- Set up CloudWatch monitoring
- Configure automated backups

---

**Your API should now be running on EC2 with PM2! 🚀**
