# Supabase Edge Function Environment Variables

For the email functions to work properly, you need to set these environment variables in your Supabase Dashboard:

1. **RESEND_API_KEY**  
   Value: `re_H3PZYtwt_JwWbXCHqM69JVCjyQvJbHPkR`  
   Required for: All email sending functions  
   Purpose: Authentication key for the Resend email API

2. **PUBLIC_SITE_URL**  
   Value: `https://mybeatfi.io`  
   Required for: All email sending functions  
   Purpose: Base URL for links in email templates

## How to Set These Variables

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to "Edge Functions" in the sidebar
4. Click on "Environment Variables"
5. Add each variable with its corresponding value
6. Click "Save"

## Verification

After setting these variables:
1. The `send-producer-approval-email` function will be able to send approval notifications
2. The `send-license-email` function will be able to send license confirmations
3. All email templates will include proper links back to your site

## Security Notes
- Keep your RESEND_API_KEY secure - don't commit it to version control
- Rotate the key immediately if it's ever compromised
- The PUBLIC_SITE_URL can be changed if your domain changes
