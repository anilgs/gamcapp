#!/bin/bash
set -e

ENVIRONMENT=${1:-dev}

echo "🗃️ Running database migrations for $ENVIRONMENT environment..."

# Get database URL from Terraform output
cd infrastructure
DB_URL=$(terraform output -raw database_url)
cd ..

echo "📡 Connecting to database..."

# Run the SQL script
if [ -f "scripts/init-db.sql" ]; then
    echo "🏗️ Running database initialization..."
    PGPASSWORD=$(echo $DB_URL | sed -n 's/.*:\/\/.*:\(.*\)@.*/\1/p') \
    psql "$DB_URL" -f scripts/init-db.sql
    echo "✅ Database initialization completed!"
else
    echo "ℹ️ No init-db.sql found, skipping database initialization"
fi

echo "🎉 Database migration completed!"