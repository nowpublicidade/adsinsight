import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const clientId = url.searchParams.get('state');
    const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';

    if (!code || !clientId) {
      return Response.redirect(`${FRONTEND_URL}/dashboard/connections?error=missing_params`);
    }

    const LINKEDIN_CLIENT_ID = Deno.env.get('LINKEDIN_CLIENT_ID')!;
    const LINKEDIN_CLIENT_SECRET = Deno.env.get('LINKEDIN_CLIENT_SECRET')!;
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const redirectUri = `${SUPABASE_URL}/functions/v1/linkedin-oauth-callback`;

    // Exchange code for token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('LinkedIn token error:', tokenData);
      return Response.redirect(`${FRONTEND_URL}/dashboard/connections?error=token_exchange`);
    }

    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 5184000; // 60 days default
    const refreshToken = tokenData.refresh_token || null;

    // Get user's organizations (admin of)
    const orgRes = await fetch(
      'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(id,localizedName)))',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const orgData = await orgRes.json();

    let orgId: string | null = null;
    if (orgData.elements && orgData.elements.length > 0) {
      const orgUrn = orgData.elements[0].organization;
      // URN format: urn:li:organization:12345
      orgId = orgUrn.split(':').pop() || null;
    }

    // Save to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('clients')
      .update({
        linkedin_access_token: accessToken,
        linkedin_refresh_token: refreshToken,
        linkedin_org_id: orgId,
        linkedin_connected_at: new Date().toISOString(),
        linkedin_token_expires_at: expiresAt,
      })
      .eq('id', clientId);

    if (updateError) {
      console.error('DB update error:', updateError);
      return Response.redirect(`${FRONTEND_URL}/dashboard/connections?error=db_update`);
    }

    console.log(`LinkedIn connected for client ${clientId}: org=${orgId}`);
    return Response.redirect(`${FRONTEND_URL}/dashboard/connections?linkedin=connected`);
  } catch (error) {
    console.error('Error in linkedin-oauth-callback:', error);
    const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
    return Response.redirect(`${FRONTEND_URL}/dashboard/connections?error=unknown`);
  }
});
