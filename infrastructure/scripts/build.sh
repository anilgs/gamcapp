#!/bin/bash
set -e

echo "🚀 Starting build process for GAMCAPP..."

# Load environment variables
if [ -f .env.local ]; then
    echo "Loading environment variables..."
    export $(cat .env.local | xargs)
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Run type checking
echo "🔍 Running type check..."
npm run type-check

# Run linting
echo "🧹 Running ESLint..."
npm run lint

# Build the Next.js application
echo "🏗️ Building Next.js application..."
npm run build

# Create deployment package
echo "📦 Creating deployment package..."
rm -rf deploy/
mkdir -p deploy

# Copy built application
cp -r .next deploy/
cp -r public deploy/
cp -r lib deploy/
cp -r pages deploy/
cp -r components deploy/
cp -r types deploy/
cp -r styles deploy/
cp -r uploads deploy/

# Copy configuration files
cp package*.json deploy/
cp next.config.js deploy/
cp tsconfig.json deploy/

# Copy ElasticBeanstalk configuration
mkdir -p deploy/.ebextensions
cp -r .ebextensions/* deploy/.ebextensions/ 2>/dev/null || true

# Create production package.json (only production dependencies)
cd deploy
npm ci --production --ignore-scripts

# Remove unnecessary files
rm -rf .git
rm -rf node_modules/.cache
rm -rf .next/cache

echo "✅ Build completed successfully!"
echo "📦 Deployment package created in ./deploy/"

# Show package size
echo "📊 Package size:"
du -sh .
cd ..

echo "🎉 Build process completed!"