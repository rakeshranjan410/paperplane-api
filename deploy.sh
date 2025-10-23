#!/bin/bash

###############################################################################
# Paperplane API - Deployment Script
# 
# This script pulls the latest changes from main branch, reinstalls 
# dependencies, kills all PM2 processes, restarts the server, and configures Nginx + SSL.
#
# Usage: 
#   ./deploy.sh                                    # Self-signed SSL
#   ./deploy.sh api.yourdomain.com your@email.com  # Let's Encrypt SSL
#   ./deploy.sh --skip-nginx                       # Skip Nginx setup
###############################################################################

set -e  # Exit on any error

# Parse arguments
DOMAIN=""
EMAIL=""
SKIP_NGINX=false

if [ "$1" = "--skip-nginx" ]; then
    SKIP_NGINX=true
elif [ -n "$1" ]; then
    DOMAIN="$1"
    EMAIL="${2:-}"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

echo "=========================================="
echo "  Paperplane API - Deployment Script"
echo "=========================================="
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "Not a git repository. Please run this script from the project root."
    exit 1
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
print_info "Current branch: $CURRENT_BRANCH"

# Stash any uncommitted changes
print_info "Checking for uncommitted changes..."
if ! git diff-index --quiet HEAD --; then
    print_warning "You have uncommitted changes. Stashing them..."
    git stash
    STASHED=true
    print_success "Changes stashed"
else
    STASHED=false
    print_success "No uncommitted changes"
fi

# Pull latest changes from main
print_info "Pulling latest changes from main branch..."
if [ "$CURRENT_BRANCH" != "main" ]; then
    print_warning "Switching to main branch..."
    git checkout main
fi

git pull origin main
print_success "Latest changes pulled"

# Show what changed
echo ""
print_info "Recent commits:"
git log --oneline -5
echo ""

# Reinstall dependencies
print_info "Reinstalling dependencies..."
npm install --production
print_success "Dependencies installed"

# Kill all PM2 processes
print_info "Stopping all PM2 processes..."
if command -v pm2 &> /dev/null; then
    pm2 delete all 2>/dev/null || true
    print_success "All PM2 processes stopped"
else
    print_error "PM2 not found. Please install PM2 first."
    exit 1
fi

# Wait a moment for processes to fully stop
sleep 2

# Start the server with PM2
print_info "Starting server with PM2 in production mode..."
pm2 start ecosystem.config.cjs --env production
print_success "Server started"

# Save PM2 configuration
print_info "Saving PM2 configuration..."
pm2 save
print_success "PM2 configuration saved"

# Show PM2 status
echo ""
print_info "Current PM2 status:"
pm2 status
echo ""

# Wait for server to start
print_info "Waiting for server to start..."
sleep 3

# Test health endpoint
print_info "Testing health endpoint..."
if curl -s -f http://localhost:4000/health > /dev/null; then
    print_success "Server is healthy! ✓"
    echo ""
    curl -s http://localhost:4000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:4000/health
else
    print_error "Health check failed. Check logs with: pm2 logs paperplane-api"
    echo ""
    print_info "Recent logs:"
    pm2 logs paperplane-api --lines 20 --nostream
    exit 1
fi

# Restore stashed changes if any
if [ "$STASHED" = true ]; then
    echo ""
    print_warning "Restoring stashed changes..."
    git stash pop
    print_success "Stashed changes restored"
fi

# Nginx + SSL Setup
if [ "$SKIP_NGINX" = false ]; then
    echo ""
    echo "=========================================="
    print_info "Setting up Nginx + SSL..."
    echo "=========================================="
    echo ""
    
    # Check if nginx directory exists
    if [ ! -d "nginx" ]; then
        print_warning "Nginx directory not found. Creating..."
        mkdir -p nginx
    fi
    
    # Check if setup script exists
    if [ -f "nginx/setup-nginx.sh" ]; then
        chmod +x nginx/setup-nginx.sh
        
        # Check if running as root
        if [ "$EUID" -eq 0 ]; then
            # Already root, run directly
            if [ -n "$DOMAIN" ] && [ -n "$EMAIL" ]; then
                print_info "Setting up with Let's Encrypt for domain: $DOMAIN"
                cd nginx && ./setup-nginx.sh "$DOMAIN" "$EMAIL" && cd ..
            else
                print_info "Setting up with self-signed certificate"
                cd nginx && ./setup-nginx.sh && cd ..
            fi
            print_success "Nginx + SSL configured"
        else
            # Not root, need sudo
            print_warning "Nginx setup requires sudo privileges"
            if [ -n "$DOMAIN" ] && [ -n "$EMAIL" ]; then
                print_info "Setting up with Let's Encrypt for domain: $DOMAIN"
                sudo bash -c "cd $(pwd)/nginx && ./setup-nginx.sh \"$DOMAIN\" \"$EMAIL\""
            else
                print_info "Setting up with self-signed certificate"
                sudo bash -c "cd $(pwd)/nginx && ./setup-nginx.sh"
            fi
            print_success "Nginx + SSL configured"
        fi
        
        # Reload nginx to pick up any config changes
        if command -v nginx &> /dev/null; then
            print_info "Reloading Nginx..."
            sudo systemctl reload nginx 2>/dev/null || true
        fi
    else
        print_warning "Nginx setup script not found at nginx/setup-nginx.sh"
        print_info "Run manually: cd nginx && sudo ./setup-nginx.sh"
    fi
fi

echo ""
echo "=========================================="
print_success "Deployment Complete! 🚀"
echo "=========================================="
echo ""

# Get public IP for display
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "YOUR_IP")

if [ "$SKIP_NGINX" = false ]; then
    print_info "Your API is now accessible at:"
    if [ -n "$DOMAIN" ]; then
        echo "  HTTPS: https://$DOMAIN"
        echo "  HTTP:  http://$DOMAIN (redirects to HTTPS)"
    else
        echo "  HTTPS: https://$PUBLIC_IP"
        echo "  HTTP:  http://$PUBLIC_IP (redirects to HTTPS)"
        echo ""
        print_warning "Using self-signed certificate - browser will show security warning"
    fi
    echo ""
    print_info "Direct access (behind nginx):"
    echo "  http://localhost:4000"
else
    print_info "Your API is running on:"
    echo "  http://localhost:4000"
    echo "  http://$PUBLIC_IP:4000"
fi

echo ""
print_info "Useful commands:"
echo "  pm2 logs paperplane-api        - View PM2 logs"
echo "  pm2 monit                      - Monitor in real-time"
echo "  pm2 restart paperplane-api     - Restart server"
if [ "$SKIP_NGINX" = false ]; then
    echo "  sudo systemctl status nginx    - Check Nginx status"
    echo "  sudo systemctl reload nginx    - Reload Nginx config"
    echo "  sudo nginx -t                  - Test Nginx config"
fi
echo ""
