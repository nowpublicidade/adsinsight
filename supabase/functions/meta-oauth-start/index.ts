import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { client_id } = await req.json();
    
    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const META_APP_ID = Deno.env.get('META_APP_ID');
    
    if (!META_APP_ID) {
      console.error('META_APP_ID not configured');
      return new Response(
        JSON.stringify({ error: 'Meta App not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the redirect URI from the request origin or use a default
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const redirectUri = `${SUPABASE_URL}/functions/v1/meta-oauth-callback`;

    // Meta OAuth scopes for ads insights + pixel data
    const scopes = [
      'ads_read',
      'ads_management', 
      'read_insights',
      'business_management',
    ].join(',');

    // Build the OAuth URL
    const authUrl = new URL('https://www.facebook.com/v24.0/dialog/oauth');
    authUrl.searchParams.set('client_id', META_APP_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', client_id); // Pass client_id in state for callback

    console.log('Generated Meta OAuth URL for client:', client_id);

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in meta-oauth-start:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
