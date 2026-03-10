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

    const META_APP_ID = Deno.env.get('META_APP_ID')!;
    const META_APP_SECRET = Deno.env.get('META_APP_SECRET')!;
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const redirectUri = `${SUPABASE_URL}/functions/v1/social-meta-oauth-callback`;

    // Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v24.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${META_APP_SECRET}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('Token exchange error:', tokenData.error);
      return Response.redirect(`${FRONTEND_URL}/dashboard/connections?error=token_exchange`);
    }

    const shortToken = tokenData.access_token;

    // Exchange for long-lived token
    const longRes = await fetch(
      `https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${shortToken}`
    );
    const longData = await longRes.json();
    const longToken = longData.access_token || shortToken;

    // Get ALL user's pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v24.0/me/accounts?access_token=${longToken}&fields=id,name,access_token,instagram_business_account,picture`
    );
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      console.error('No pages found');
      return Response.redirect(`${FRONTEND_URL}/dashboard/connections?error=no_pages`);
    }

    // Store ALL pages for user selection
    const availablePages = pagesData.data.map((page: any) => ({
      id: page.id,
      name: page.name,
      access_token: page.access_token,
      instagram_business_account: page.instagram_business_account?.id || null,
      picture: page.picture?.data?.url || null,
    }));

    // Save available pages to database — don't auto-select
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const updates: Record<string, any> = {
      fb_available_pages: availablePages,
      fb_page_connected_at: new Date().toISOString(),
    };

    // If only one page, auto-select it
    if (availablePages.length === 1) {
      const page = availablePages[0];
      updates.fb_page_id = page.id;
      updates.fb_page_token = page.access_token;
      if (page.instagram_business_account) {
        updates.ig_account_id = page.instagram_business_account;
        updates.ig_connected_at = new Date().toISOString();
      }
    }

    const { error: updateError } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', clientId);

    if (updateError) {
      console.error('DB update error:', updateError);
      return Response.redirect(`${FRONTEND_URL}/dashboard/connections?error=db_update`);
    }

    const suffix = availablePages.length === 1 ? 'social_meta=connected' : 'social_meta=select_page';
    console.log(`Social Meta OAuth done for client ${clientId}: ${availablePages.length} pages found`);
    return Response.redirect(`${FRONTEND_URL}/dashboard/connections?${suffix}`);
  } catch (error) {
    console.error('Error in social-meta-oauth-callback:', error);
    const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
    return Response.redirect(`${FRONTEND_URL}/dashboard/connections?error=unknown`);
  }
});
