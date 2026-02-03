import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const url = new URL(req.url);
  
  // Get the authorization code and state (client_id) from query params
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // This is the client_id
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  // Get frontend URL for redirect
  const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://lovable.dev';

  if (error) {
    console.error('Meta OAuth error:', error, errorDescription);
    return Response.redirect(`${FRONTEND_URL}/dashboard/connections?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!code || !state) {
    console.error('Missing code or state');
    return Response.redirect(`${FRONTEND_URL}/dashboard/connections?error=missing_params`);
  }

  try {
    const META_APP_ID = Deno.env.get('META_APP_ID');
    const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!META_APP_ID || !META_APP_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/meta-oauth-callback`;

    // Exchange code for short-lived access token
    console.log('Exchanging code for access token...');
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v24.0/oauth/access_token?` +
      `client_id=${META_APP_ID}&` +
      `client_secret=${META_APP_SECRET}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `code=${code}`
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Token exchange error:', tokenData.error);
      throw new Error(tokenData.error.message || 'Failed to exchange code');
    }

    const shortLivedToken = tokenData.access_token;
    console.log('Got short-lived token');

    // Exchange for long-lived token (60 days)
    console.log('Exchanging for long-lived token...');
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v24.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${META_APP_ID}&` +
      `client_secret=${META_APP_SECRET}&` +
      `fb_exchange_token=${shortLivedToken}`
    );

    const longLivedData = await longLivedResponse.json();

    if (longLivedData.error) {
      console.error('Long-lived token error:', longLivedData.error);
      throw new Error(longLivedData.error.message || 'Failed to get long-lived token');
    }

    const accessToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in || 5184000; // Default to 60 days
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    console.log('Got long-lived token, expires at:', expiresAt);

    // Get user info and ad accounts
    console.log('Fetching user info and ad accounts...');
    const meResponse = await fetch(
      `https://graph.facebook.com/v24.0/me?fields=id,name,email&access_token=${accessToken}`
    );
    const meData = await meResponse.json();

    if (meData.error) {
      console.error('Me endpoint error:', meData.error);
      throw new Error(meData.error.message || 'Failed to get user info');
    }

    // Get ad accounts
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v24.0/me/adaccounts?fields=id,name,account_status&access_token=${accessToken}`
    );
    const adAccountsData = await adAccountsResponse.json();

    let adAccountId = null;
    if (adAccountsData.data && adAccountsData.data.length > 0) {
      // Get the first active ad account
      const activeAccount = adAccountsData.data.find((acc: any) => acc.account_status === 1) || adAccountsData.data[0];
      adAccountId = activeAccount.id;
      console.log('Found ad account:', adAccountId);
    }

    // Update client in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        meta_access_token: accessToken,
        meta_token_expires_at: expiresAt.toISOString(),
        meta_user_id: meData.id,
        meta_ad_account_id: adAccountId,
        meta_connected_at: new Date().toISOString(),
      })
      .eq('id', state);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Failed to save connection');
    }

    console.log('Successfully connected Meta Ads for client:', state);

    // Redirect back to connections page with success
    return Response.redirect(`${FRONTEND_URL}/dashboard/connections?success=meta`);
  } catch (error) {
    console.error('Error in meta-oauth-callback:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.redirect(`${FRONTEND_URL}/dashboard/connections?error=${encodeURIComponent(message)}`);
  }
});
