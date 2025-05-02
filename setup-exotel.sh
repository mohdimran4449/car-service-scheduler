#!/bin/bash

# Replace these with your actual Exotel credentials
EXOTEL_SID="your_exotel_sid"
EXOTEL_TOKEN="your_exotel_token"

# Replace with your Vercel deployment URL
VERCEL_URL="your_vercel_url"

# Set up Exotel webhook
exotel numbers list | grep "IN" | while read -r line; do
    NUMBER=$(echo $line | awk '{print $1}')
    
    # Update the webhook URL
    exotel numbers update $NUMBER --answer-url="$VERCEL_URL/exotel/webhook" --hangup-url="$VERCEL_URL/exotel/webhook/hangup"
    
    echo "Updated webhook for number: $NUMBER"
done

# Output the setup information
echo "\nExotel Setup Complete!"
echo "Webhook URL: $VERCEL_URL/exotel/webhook"
echo "Hangup URL: $VERCEL_URL/exotel/webhook/hangup"
