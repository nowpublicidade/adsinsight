import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const url = new URL(req.url);
  
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // client_id
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://lovable.dev';

  if (error) {
    console.error('Google OAuth error:', error, errorDescription);
    return Response.redirect(`${FRONTEND_URL}/dashboard/connections?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!code || !state) {
    console.error('Missing code or state');
    return Response.redirect(`${FRONTEND_URL}/dashboard/connections?error=missing_params`);
  }

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const GOOGLE_DEVELOPER_TOKEN = Deno.env.get('GOOGLE_DEVELOPER_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;

    // Exchange code for tokens
    console.log('Exchanging code for tokens...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Token exchange error:', tokenData.error);
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    console.log('Got tokens, expires at:', expiresAt);

    // Get Google Ads customer ID using the Ads API
    let customerId = null;
    
    if (GOOGLE_DEVELOPER_TOKEN) {
      try {
        console.log('Fetching Google Ads customer accounts...');
        const customersResponse = await fetch(
          'https://googleads.googleapis.com/v19/customers:listAccessibleCustomers',
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'developer-token': GOOGLE_DEVELOPER_TOKEN,
            },
          }
        );

        const customersData = await customersResponse.json();
        console.log('Customers response:', JSON.stringify(customersData));

        if (customersData.resourceNames && customersData.resourceNames.length > 0) {
          // Extract customer ID from resource name (format: customers/1234567890)
          const firstCustomer = customersData.resourceNames[0];
          customerId = firstCustomer.replace('customers/', '');
          console.log('Found customer ID:', customerId);
        }
      } catch (err) {
        console.error('Error fetching Google Ads customers:', err);
        // Continue without customer ID - user might not have Ads access
      }
    }

    // Update client in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        google_access_token: accessToken,
        google_refresh_token: refreshToken,
        google_token_expires_at: expiresAt.toISOString(),
        google_customer_id: customerId,
        google_connected_at: new Date().toISOString(),
      })
      .eq('id', state);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Failed to save connection');
    }

    console.log('Successfully connected Google Ads for client:', state);

    return Response.redirect(`${FRONTEND_URL}/dashboard/connections?success=google`);
  } catch (error) {
    console.error('Error in google-oauth-callback:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.redirect(`${FRONTEND_URL}/dashboard/connections?error=${encodeURIComponent(message)}`);
  }
});
