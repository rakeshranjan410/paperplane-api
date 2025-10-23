#!/bin/bash

###############################################################################
# Nginx + SSL Setup Script for Paperplane API
# 
# This script installs and configures Nginx with SSL for Paperplane API
# Supports both self-signed certificates (for IP) and Let's Encrypt (for domain)
#
# Usage: 
#   sudo ./setup-nginx.sh
#   sudo ./setup-nginx.sh api.yourdomain.com your@email.com  # For Let's Encrypt
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  Nginx + SSL Setup for Paperplane API ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root: sudo ./setup-nginx.sh"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DOMAIN="${1:-}"
EMAIL="${2:-}"

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    print_error "Cannot detect OS"
    exit 1
fi

print_info "Detected OS: $OS"

# Install Nginx
print_info "Installing Nginx..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    apt-get update -qq
    apt-get install -y nginx
elif [ "$OS" = "amzn" ]; then
    amazon-linux-extras install -y nginx1
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    yum install -y nginx
else
    print_error "Unsupported OS: $OS"
    exit 1
fi

print_success "Nginx installed"

# Stop nginx if running
systemctl stop nginx 2>/dev/null || true

# Create SSL directory
print_info "Creating SSL directory..."
mkdir -p /etc/nginx/ssl
chmod 700 /etc/nginx/ssl

# SSL Setup
if [ -n "$DOMAIN" ] && [ -n "$EMAIL" ]; then
    # Let's Encrypt setup
    print_info "Setting up Let's Encrypt SSL for domain: $DOMAIN"
    
    # Install certbot
    print_info "Installing Certbot..."
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt-get install -y certbot python3-certbot-nginx
    elif [ "$OS" = "amzn" ]; then
        yum install -y certbot python3-certbot-nginx
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        yum install -y certbot python3-certbot-nginx
    fi
    
    print_success "Certbot installed"
    
    # Update nginx config with domain
    sed -i "s/server_name _;/server_name $DOMAIN;/g" "$SCRIPT_DIR/paperplane-api.conf"
    
    # Copy nginx config
    print_info "Copying Nginx configuration..."
    cp "$SCRIPT_DIR/paperplane-api.conf" /etc/nginx/sites-available/paperplane-api 2>/dev/null || \
    cp "$SCRIPT_DIR/paperplane-api.conf" /etc/nginx/conf.d/paperplane-api.conf
    
    # Create symlink for sites-enabled (Ubuntu/Debian)
    if [ -d /etc/nginx/sites-enabled ]; then
        ln -sf /etc/nginx/sites-available/paperplane-api /etc/nginx/sites-enabled/
    fi
    
    # Start nginx first
    systemctl start nginx
    
    # Get Let's Encrypt certificate
    print_info "Obtaining Let's Encrypt certificate..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect
    
    print_success "Let's Encrypt SSL configured"
    
else
    # Self-signed certificate setup
    print_info "Setting up self-signed SSL certificate..."
    
    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/paperplane-api.key \
        -out /etc/nginx/ssl/paperplane-api.crt \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=paperplane-api" \
        2>/dev/null
    
    chmod 600 /etc/nginx/ssl/paperplane-api.key
    chmod 644 /etc/nginx/ssl/paperplane-api.crt
    
    print_success "Self-signed certificate created"
    
    # Copy nginx config
    print_info "Copying Nginx configuration..."
    cp "$SCRIPT_DIR/paperplane-api.conf" /etc/nginx/sites-available/paperplane-api 2>/dev/null || \
    cp "$SCRIPT_DIR/paperplane-api.conf" /etc/nginx/conf.d/paperplane-api.conf
    
    # Create symlink for sites-enabled (Ubuntu/Debian)
    if [ -d /etc/nginx/sites-enabled ]; then
        ln -sf /etc/nginx/sites-available/paperplane-api /etc/nginx/sites-enabled/
    fi
    
    print_warning "Using self-signed certificate (browser will show warning)"
fi

# Test nginx configuration
print_info "Testing Nginx configuration..."
if nginx -t; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Configure firewall
print_info "Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 'Nginx Full' 2>/dev/null || true
    ufw allow 443/tcp 2>/dev/null || true
    ufw allow 80/tcp 2>/dev/null || true
    print_success "UFW configured"
fi

# Start and enable Nginx
print_info "Starting Nginx..."
systemctl start nginx
systemctl enable nginx

print_success "Nginx is running"

# Display status
echo ""
print_success "Nginx + SSL setup complete!"
echo ""

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "YOUR_IP")

if [ -n "$DOMAIN" ]; then
    print_info "Your API is now accessible at:"
    echo "  HTTPS: https://$DOMAIN"
    echo "  HTTP:  http://$DOMAIN (redirects to HTTPS)"
else
    print_info "Your API is now accessible at:"
    echo "  HTTPS: https://$PUBLIC_IP"
    echo "  HTTP:  http://$PUBLIC_IP (redirects to HTTPS)"
    echo ""
    print_warning "Using self-signed certificate - browser will show security warning"
    print_info "To use Let's Encrypt with a domain:"
    echo "  sudo ./setup-nginx.sh api.yourdomain.com your@email.com"
fi

echo ""
print_info "Useful commands:"
echo "  sudo systemctl status nginx    - Check Nginx status"
echo "  sudo systemctl reload nginx    - Reload configuration"
echo "  sudo nginx -t                  - Test configuration"
echo "  sudo tail -f /var/log/nginx/paperplane-api.access.log  - View access logs"
echo "  sudo tail -f /var/log/nginx/paperplane-api.error.log   - View error logs"

if [ -n "$DOMAIN" ]; then
    echo ""
    print_info "SSL Certificate renewal:"
    echo "  Certbot will auto-renew. Check with: sudo certbot renew --dry-run"
fi

echo ""
