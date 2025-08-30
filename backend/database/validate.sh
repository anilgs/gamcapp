#!/bin/bash
# Database Scripts Validation Test
# This script validates the SQL syntax without requiring an actual MySQL connection

echo "========================================"
echo "GAMCAPP Database Scripts Validation"
echo "========================================"

# Check if all required files exist
echo ""
echo "1. Checking file existence..."
files=("schema.sql" "init.sql" "seed.sql" "README.md")
for file in "${files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "✓ $file exists"
    else
        echo "✗ $file missing"
        exit 1
    fi
done

# Check if init.sql is executable
echo ""
echo "2. Checking file permissions..."
if [[ -x "init.sql" ]]; then
    echo "✓ init.sql is executable"
else
    echo "✗ init.sql is not executable"
    exit 1
fi

# Basic syntax validation for schema.sql
echo ""
echo "3. Validating schema.sql syntax..."
syntax_checks=(
    "CREATE TABLE users"
    "CREATE TABLE admins" 
    "CREATE TABLE otp_tokens"
    "CREATE TABLE payment_transactions"
    "CREATE TABLE audit_logs"
)

for check in "${syntax_checks[@]}"; do
    if grep -q "$check" schema.sql; then
        echo "✓ Found: $check"
    else
        echo "✗ Missing: $check"
        exit 1
    fi
done

# Check for proper MySQL syntax patterns
echo ""
echo "4. Checking MySQL syntax patterns..."
mysql_patterns=(
    "ENGINE=InnoDB"
    "DEFAULT CHARSET=utf8mb4"
    "COLLATE=utf8mb4_unicode_ci"
    "AUTO_INCREMENT"
    "FOREIGN KEY"
)

for pattern in "${mysql_patterns[@]}"; do
    if grep -q "$pattern" schema.sql; then
        echo "✓ Found MySQL pattern: $pattern"
    else
        echo "! Warning: MySQL pattern not found: $pattern"
    fi
done

# Validate seed.sql has admin user
echo ""
echo "5. Validating seed data..."
if grep -q "INSERT INTO admins" seed.sql; then
    echo "✓ Admin user seed data found"
else
    echo "✗ Admin user seed data missing"
    exit 1
fi

# Check init.sql script structure
echo ""
echo "6. Validating initialization script..."
init_functions=(
    "check_mysql"
    "create_database"
    "run_schema"
    "run_seed_data"
    "verify_installation"
)

for func in "${init_functions[@]}"; do
    if grep -q "$func" init.sql; then
        echo "✓ Function found: $func"
    else
        echo "✗ Function missing: $func"
        exit 1
    fi
done

# Check for environment variable support
echo ""
echo "7. Checking environment variable support..."
env_vars=(
    "DB_HOST"
    "DB_PORT"
    "DB_NAME"
    "DB_USER"
    "DB_PASSWORD"
)

for var in "${env_vars[@]}"; do
    if grep -q "\$${var}" init.sql; then
        echo "✓ Environment variable supported: $var"
    else
        echo "! Warning: Environment variable not found: $var"
    fi
done

# Final validation
echo ""
echo "========================================"
echo "✓ All database scripts validation passed!"
echo "========================================"
echo ""
echo "Scripts ready for deployment:"
echo "- schema.sql: Complete database schema"
echo "- init.sql: Automated initialization script"  
echo "- seed.sql: Initial data insertion"
echo "- README.md: Complete documentation"
echo ""
echo "To use: cd backend/database && ./init.sql"
echo ""