#!/bin/bash

###############################################################################
# PM2 Setup Script for Paperplane API
# 
# This script automates the PM2 setup process on EC2 or any Linux server.
# It checks for required dependencies, creates necessary directories,
# and starts the application with PM2.
#
# Usage: 
#   chmod +x setup-pm2.sh
#   ./setup-pm2.sh
###############################################################################

set -e  # Exit on any error

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
echo "  Paperplane API - PM2 Setup Script"
echo "=========================================="
echo ""

# Check if Node.js is installed
print_info "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    print_info "Please install Node.js 18+ first:"
    echo "  curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -"
    echo "  sudo yum install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js is installed: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed!"
    exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm is installed: $NPM_VERSION"

# Check if PM2 is installed
print_info "Checking PM2 installation..."
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 is not installed. Installing PM2 globally..."
    sudo npm install -g pm2
    print_success "PM2 installed successfully"
else
    PM2_VERSION=$(pm2 --version)
    print_success "PM2 is already installed: $PM2_VERSION"
fi

# Check if .env file exists
print_info "Checking environment configuration..."
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    print_info "Creating .env from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning "Please edit .env file with your production credentials:"
        echo "  nano .env"
        exit 1
    else
        print_error ".env.example not found. Cannot create .env file."
        exit 1
    fi
else
    print_success ".env file exists"
fi

# Check if dependencies are installed
print_info "Checking npm dependencies..."
if [ ! -d "node_modules" ]; then
    print_warning "Dependencies not installed. Installing now..."
    npm install --production
    print_success "Dependencies installed"
else
    print_success "Dependencies are already installed"
fi

# Create logs directory
print_info "Creating logs directory..."
if [ ! -d "logs" ]; then
    mkdir -p logs
    print_success "Logs directory created"
else
    print_success "Logs directory already exists"
fi

# Check if ecosystem.config.js exists
if [ ! -f "ecosystem.config.js" ]; then
    print_error "ecosystem.config.js not found!"
    exit 1
fi

# Check if app is already running
print_info "Checking if app is already running..."
if pm2 describe paperplane-api &> /dev/null; then
    print_warning "App is already running. Would you like to reload it? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        pm2 reload paperplane-api
        print_success "App reloaded successfully"
    else
        print_info "Keeping existing app running"
    fi
else
    # Ask which environment to use
    print_info "Select environment:"
    echo "  1) Production (recommended for EC2)"
    echo "  2) Development"
    read -p "Enter choice (1 or 2): " env_choice

    if [ "$env_choice" = "1" ]; then
        print_info "Starting app in PRODUCTION mode..."
        pm2 start ecosystem.config.js --env production
        print_success "App started in production mode"
    elif [ "$env_choice" = "2" ]; then
        print_info "Starting app in DEVELOPMENT mode..."
        pm2 start ecosystem.config.js --env development
        print_success "App started in development mode"
    else
        print_error "Invalid choice. Exiting."
        exit 1
    fi
fi

# Show PM2 status
echo ""
print_info "Current PM2 status:"
pm2 status

# Ask to save PM2 configuration
echo ""
print_warning "Would you like to save PM2 configuration? (y/n)"
read -r save_response
if [[ "$save_response" =~ ^[Yy]$ ]]; then
    pm2 save
    print_success "PM2 configuration saved"
fi

# Ask to setup auto-start on reboot
echo ""
print_warning "Would you like to enable PM2 auto-start on system reboot? (y/n)"
read -r startup_response
if [[ "$startup_response" =~ ^[Yy]$ ]]; then
    print_info "Setting up PM2 startup script..."
    pm2 startup
    echo ""
    print_warning "Please run the command shown above (if any) to complete startup setup"
fi

echo ""
echo "=========================================="
print_success "PM2 Setup Complete!"
echo "=========================================="
echo ""
print_info "Useful commands:"
echo "  pm2 status              - View app status"
echo "  pm2 logs paperplane-api - View logs"
echo "  pm2 monit               - Monitor in real-time"
echo "  pm2 restart paperplane-api - Restart app"
echo "  pm2 reload paperplane-api  - Zero-downtime reload"
echo ""
print_info "Testing your API:"
echo "  curl http://localhost:4000/health"
echo ""

# Test the health endpoint
print_info "Testing health endpoint..."
sleep 2  # Wait for app to fully start
if curl -s http://localhost:4000/health > /dev/null; then
    print_success "API is responding! ✓"
    echo ""
    curl -s http://localhost:4000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:4000/health
else
    print_warning "API is not responding yet. Check logs with: pm2 logs paperplane-api"
fi

echo ""
print_success "Setup complete! Your API is now running with PM2."
