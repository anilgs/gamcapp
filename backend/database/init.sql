#!/bin/bash
# GAMCAPP Database Initialization Script
# This script creates the database and initializes the schema

set -e  # Exit on any error

# Database configuration (modify these as needed)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-gamcapp}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-admin123$}"
ADMIN_DB_USER="${ADMIN_DB_USER:-admin}"
ADMIN_DB_PASSWORD="${ADMIN_DB_PASSWORD:-admin123$}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if MySQL is running with better debugging
check_mysql() {
    print_status "Checking MySQL connection..."
    
    # Test basic connectivity first
    if ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
        print_error "Cannot reach MySQL at $DB_HOST:$DB_PORT"
        print_error "Check if MySQL is running and accessible"
        exit 1
    fi
    
    # Test MySQL connection with better error reporting
    if ! mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" \
              --connect-timeout=10 \
              -e "SELECT 1" 2>&1; then
        print_error "MySQL connection failed. Details:"
        mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" \
              -e "SELECT 1" 2>&1 | while read line; do
            print_error "  $line"
        done
        exit 1
    fi
    
    print_success "MySQL connection established"
}
# Function to create database and user
create_database() {
    print_status "Creating database '$DB_NAME'..."
    
    # Create database if it doesn't exist
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
    
    print_success "Database '$DB_NAME' created/verified"
    
    # Create user if credentials provided
    if [ -n "$ADMIN_DB_USER" ] && [ -n "$ADMIN_DB_PASSWORD" ]; then
        print_status "Creating database user '$ADMIN_DB_USER'..."
        mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "CREATE USER IF NOT EXISTS '$ADMIN_DB_USER'@'localhost' IDENTIFIED BY '$ADMIN_DB_PASSWORD';" 2>/dev/null
        mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$ADMIN_DB_USER'@'localhost';" 2>/dev/null
        mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "FLUSH PRIVILEGES;" 2>/dev/null
        print_success "Database user '$ADMIN_DB_USER' created with privileges"
    fi
}

# Function to run schema
run_schema() {
    print_status "Applying database schema..."
    
    # Get the directory where this script is located
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    if [ ! -f "$SCRIPT_DIR/schema.sql" ]; then
        print_error "Schema file not found at $SCRIPT_DIR/schema.sql"
        exit 1
    fi
    
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$SCRIPT_DIR/schema.sql"
    print_success "Database schema applied successfully"
}

# Function to run seed data
run_seed_data() {
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    if [ -f "$SCRIPT_DIR/seed.sql" ]; then
        print_status "Applying seed data..."
        mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$SCRIPT_DIR/seed.sql"
        print_success "Seed data applied successfully"
    else
        print_warning "No seed data file found (seed.sql). Skipping..."
    fi
}

# Function to verify installation
verify_installation() {
    print_status "Verifying database installation..."
    
    # Check if tables exist
    TABLES=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null | wc -l)
    
    if [ "$TABLES" -gt 1 ]; then  # More than 1 line (header + tables)
        print_success "Database installation verified - $(($TABLES - 1)) tables created"
        
        # Show table list
        print_status "Created tables:"
        mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null
    else
        print_error "Database installation failed - no tables found"
        exit 1
    fi
}

# Main execution
main() {
    echo "========================================"
    echo "GAMCAPP Database Initialization"
    echo "========================================"
    echo ""
    
    # Load environment variables from .env if it exists
    if [ -f "$(dirname "$0")/../.env" ]; then
        print_status "Loading environment variables from .env file..."
        export $(grep -v '^#' "$(dirname "$0")/../.env" | xargs)
    fi
    
    check_mysql
    create_database
    run_schema
    run_seed_data
    verify_installation
    
    echo ""
    print_success "Database initialization completed successfully!"
    print_status "You can now start your GAMCAPP application."
    echo ""
}

# Show usage if help requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "GAMCAPP Database Initialization Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Environment variables:"
    echo "  DB_HOST              Database host (default: localhost)"
    echo "  DB_PORT              Database port (default: 3306)"
    echo "  DB_NAME              Database name (default: gamcapp)"
    echo "  DB_USER              Database user (default: root)"
    echo "  DB_PASSWORD          Database password"
    echo "  ADMIN_DB_USER        Application database user to create"
    echo "  ADMIN_DB_PASSWORD    Application database user password"
    echo ""
    echo "Examples:"
    echo "  $0                           # Use defaults"
    echo "  DB_PASSWORD=secret $0        # Set password"
    echo "  source .env && $0            # Load from .env file"
    echo ""
    exit 0
fi

# Run main function
main "$@"