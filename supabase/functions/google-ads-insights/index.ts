import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Convert date_preset to date range
function getDateRange(preset?: string, range?: { start: string; end: string }): { start: string; end: string } {
  // If explicit range provided, use it
  if (range?.start && range?.end) {
    return range;
  }
  
  const now = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  switch (preset) {
    case 'today':
      return { start: formatDate(now), end: formatDate(now) };
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: formatDate(yesterday), end: formatDate(yesterday) };
    }
    case 'last_14d': {
      const start14 = new Date(now);
      start14.setDate(start14.getDate() - 14);
      return { start: formatDate(start14), end: formatDate(now) };
    }
    case 'last_30d': {
      const start30 = new Date(now);
      start30.setDate(start30.getDate() - 30);
      return { start: formatDate(start30), end: formatDate(now) };
    }
    case 'this_month': {
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: formatDate(thisMonth), end: formatDate(now) };
    }
    case 'last_month': {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: formatDate(lastMonthStart), end: formatDate(lastMonthEnd) };
    }
    case 'last_7d':
    default: {
      const start7 = new Date(now);
      start7.setDate(start7.getDate() - 7);
      return { start: formatDate(start7), end: formatDate(now) };
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { client_id, date_preset, date_range } = await req.json();

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const GOOGLE_DEVELOPER_TOKEN = Deno.env.get('GOOGLE_DEVELOPER_TOKEN');
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_DEVELOPER_TOKEN) {
      throw new Error('Missing configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('google_access_token, google_refresh_token, google_customer_id, google_token_expires_at')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    if (!client.google_access_token || !client.google_customer_id) {
      return new Response(
        JSON.stringify({ error: 'Google Ads not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = client.google_access_token;

    // Check if token needs refresh
    if (client.google_token_expires_at && new Date(client.google_token_expires_at) < new Date()) {
      console.log('Refreshing Google token...');
      
      if (!client.google_refresh_token) {
        return new Response(
          JSON.stringify({ error: 'Token expired and no refresh token available', code: 'TOKEN_EXPIRED' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Refresh the token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          refresh_token: client.google_refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      const refreshData = await refreshResponse.json();

      if (refreshData.error) {
        console.error('Token refresh error:', refreshData.error);
        return new Response(
          JSON.stringify({ error: 'Failed to refresh token', code: 'TOKEN_EXPIRED' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      accessToken = refreshData.access_token;
      const expiresAt = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000);

      // Update token in database
      await supabase
        .from('clients')
        .update({
          google_access_token: accessToken,
          google_token_expires_at: expiresAt.toISOString(),
        })
        .eq('id', client_id);

      console.log('Token refreshed successfully');
    }

    // Get date range from preset or explicit range
    const dateRange = getDateRange(date_preset, date_range);
    const start = dateRange.start;
    const end = dateRange.end;

    console.log(`Date range: ${start} to ${end} (preset: ${date_preset})`);

    // Remove hyphens from customer ID - Google Ads API requires ID without hyphens
    const customerId = client.google_customer_id.replace(/-/g, '');

    // Build Google Ads API query
    const query = `
      SELECT
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.conversions_value,
        metrics.cost_per_conversion
      FROM customer
      WHERE segments.date BETWEEN '${start}' AND '${end}'
    `;

    console.log('Fetching Google Ads data for customer:', customerId);

    const gaqlResponse = await fetch(
      `https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': GOOGLE_DEVELOPER_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    const gaqlData = await gaqlResponse.json();

    if (gaqlData.error) {
      console.error('Google Ads API error:', gaqlData.error);
      throw new Error(gaqlData.error.message || 'Failed to fetch Google Ads data');
    }

    // Process results
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;
    let totalConversionValue = 0;

    if (gaqlData && Array.isArray(gaqlData)) {
      for (const batch of gaqlData) {
        if (batch.results) {
          for (const result of batch.results) {
            const metrics = result.metrics || {};
            totalSpend += (metrics.costMicros || 0) / 1000000;
            totalImpressions += metrics.impressions || 0;
            totalClicks += metrics.clicks || 0;
            totalConversions += metrics.conversions || 0;
            totalConversionValue += metrics.conversionsValue || 0;
          }
        }
      }
    }

    // Calculate derived metrics
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const cpl = totalConversions > 0 ? totalSpend / totalConversions : 0;

    // Standardized metric names to match ReportEditor expectations
    const metrics = {
      cost: totalSpend,                    // Renamed from 'spend'
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr,
      average_cpc: cpc,                    // Renamed from 'cpc'
      average_cpm: cpm,                    // New metric
      conversions: totalConversions,
      conversion_value: totalConversionValue,
      cost_per_conversion: cpl,
    };

    console.log('Successfully fetched Google Ads insights:', JSON.stringify(metrics));

    return new Response(
      JSON.stringify({ metrics }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in google-ads-insights:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
