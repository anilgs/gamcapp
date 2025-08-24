#!/bin/bash
set -e

ENVIRONMENT=${1:-dev}
VERSION=${2:-$(date +%Y%m%d-%H%M%S)}

echo "🚀 Deploying GAMCAPP to $ENVIRONMENT environment..."

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo "❌ Invalid environment. Use: dev, staging, or prod"
    exit 1
fi

# Check if deployment package exists
if [ ! -d "deploy" ]; then
    echo "❌ Deployment package not found. Run build.sh first."
    exit 1
fi

echo "📦 Deploying version: $VERSION"

# Initialize Terraform if needed
if [ ! -d "infrastructure/.terraform" ]; then
    echo "🏗️ Initializing Terraform..."
    cd infrastructure
    terraform init
    cd ..
fi

# Deploy infrastructure
echo "🏗️ Deploying infrastructure..."
cd infrastructure
terraform workspace select $ENVIRONMENT 2>/dev/null || terraform workspace new $ENVIRONMENT
terraform plan -input=false -var-file="environments/$ENVIRONMENT/terraform.tfvars" -out=tfplan
terraform apply -input=false tfplan

# Get ElasticBeanstalk application and environment names
APP_NAME=$(terraform output -raw eb_application_name)
ENV_NAME=$(terraform output -raw eb_environment_name)
cd ..

echo "📦 Application Name: $APP_NAME"
echo "🌍 Environment Name: $ENV_NAME"

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    echo "❌ EB CLI not found. Please install it first:"
    echo "pip install awsebcli"
    exit 1
fi

# Initialize EB CLI if needed
if [ ! -f ".elasticbeanstalk/config.yml" ]; then
    echo "🔧 Initializing EB CLI..."
    eb init $APP_NAME --region ap-south-1 --platform "Node.js 18 running on 64bit Amazon Linux 2023"
fi

# Create application version
echo "📦 Creating application version..."
cd deploy
zip -r "../gamcapp-$VERSION.zip" . -x "*.git*" "node_modules/.cache/*"
cd ..

# Upload and deploy
echo "🚀 Uploading and deploying to ElasticBeanstalk..."
aws s3 cp "gamcapp-$VERSION.zip" "s3://$(cd infrastructure && terraform output -raw s3_bucket_versions)/"

aws elasticbeanstalk create-application-version \
    --application-name "$APP_NAME" \
    --version-label "$VERSION" \
    --source-bundle S3Bucket="$(cd infrastructure && terraform output -raw s3_bucket_versions)",S3Key="gamcapp-$VERSION.zip"

aws elasticbeanstalk update-environment \
    --environment-name "$ENV_NAME" \
    --version-label "$VERSION"

echo "⏳ Waiting for deployment to complete..."
aws elasticbeanstalk wait environment-updated --environment-names "$ENV_NAME"

# Get environment URL
APP_URL=$(cd infrastructure && terraform output -raw eb_environment_url)
echo "✅ Deployment completed successfully!"
echo "🌐 Application URL: $APP_URL"

# Clean up
rm -f "gamcapp-$VERSION.zip"

echo "🎉 Deployment to $ENVIRONMENT completed!"