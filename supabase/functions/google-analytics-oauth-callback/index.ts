import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // client_id
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://lovable.dev';

  if (error) {
    console.error('Google Analytics OAuth error:', error, errorDescription);
    return Response.redirect(`${FRONTEND_URL}/dashboard/connections?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!code || !state) {
    return Response.redirect(`${FRONTEND_URL}/dashboard/connections?error=missing_params`);
  }

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/google-analytics-oauth-callback`;

    // Exchange code for tokens
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
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Update client in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: updateError } = await supabase
      .from('clients')
      .update({
        ga_access_token: accessToken,
        ga_refresh_token: refreshToken,
        ga_token_expires_at: expiresAt.toISOString(),
        ga_connected_at: new Date().toISOString(),
      })
      .eq('id', state);

    if (updateError) {
      throw new Error('Failed to save connection');
    }

    console.log('Successfully connected Google Analytics for client:', state);
    return Response.redirect(`${FRONTEND_URL}/dashboard/connections?success=analytics`);
  } catch (err) {
    console.error('Error in google-analytics-oauth-callback:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.redirect(`${FRONTEND_URL}/dashboard/connections?error=${encodeURIComponent(message)}`);
  }
});
