#!/bin/bash

# Build the React frontend
npm run build

# Install Vercel CLI if not installed
if ! command -v vercel &> /dev/null; then
    npm install -g vercel
fi

# Login to Vercel
vercel login

# Deploy the application
vercel deploy --prod

# Output the deployment URL
echo "\nDeployment URL:"
vercel url
