#!/bin/bash

# Database Migration Runner
# This script runs all migration files in the database directory

set -e

# Check if required environment variables are set
if [[ -z "$DB_HOST" || -z "$DB_USER" || -z "$DB_PASSWORD" || -z "$DB_NAME" ]]; then
    echo "Error: Required database environment variables are not set"
    echo "Required: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Running database migrations..."
echo "Database: $DB_NAME on $DB_HOST"

# List of migration files to run (in order)
MIGRATIONS=(
    "migrate_otp_table.sql"
    "migrate_passport_nullable.sql"
    "migrate_appointments_table.sql"
)

# Run each migration
for migration in "${MIGRATIONS[@]}"; do
    migration_file="$SCRIPT_DIR/$migration"
    
    if [[ -f "$migration_file" ]]; then
        echo "Running migration: $migration"
        
        if mysql -h"$DB_HOST" -P"${DB_PORT:-3306}" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$migration_file"; then
            echo "✅ Migration $migration completed successfully"
        else
            echo "❌ Migration $migration failed"
            exit 1
        fi
    else
        echo "⚠️  Migration file not found: $migration_file"
    fi
done

echo "All migrations completed successfully!"