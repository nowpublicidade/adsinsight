import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getDateRange(preset?: string, range?: { start: string; end: string }): { start: string; end: string } {
  if (range?.start && range?.end) return range;
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  switch (preset) {
    case 'today': return { start: fmt(now), end: fmt(now) };
    case 'yesterday': { const y = new Date(now); y.setDate(y.getDate() - 1); return { start: fmt(y), end: fmt(y) }; }
    case 'last_14d': { const s = new Date(now); s.setDate(s.getDate() - 14); return { start: fmt(s), end: fmt(now) }; }
    case 'last_30d': { const s = new Date(now); s.setDate(s.getDate() - 30); return { start: fmt(s), end: fmt(now) }; }
    case 'this_month': return { start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), end: fmt(now) };
    case 'last_month': return { start: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)), end: fmt(new Date(now.getFullYear(), now.getMonth(), 0)) };
    case 'last_90d': { const s = new Date(now); s.setDate(s.getDate() - 90); return { start: fmt(s), end: fmt(now) }; }
    case 'last_180d': { const s = new Date(now); s.setDate(s.getDate() - 180); return { start: fmt(s), end: fmt(now) }; }
    case 'last_365d': { const s = new Date(now); s.setDate(s.getDate() - 365); return { start: fmt(s), end: fmt(now) }; }
    default: { const s = new Date(now); s.setDate(s.getDate() - 7); return { start: fmt(s), end: fmt(now) }; }
  }
}

async function getAccessToken(client: any, clientId: string, supabase: any) {
  let accessToken = client.google_access_token;
  if (client.google_token_expires_at && new Date(client.google_token_expires_at) < new Date()) {
    if (!client.google_refresh_token) throw new Error('Token expired and no refresh token');
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, refresh_token: client.google_refresh_token, grant_type: 'refresh_token' }),
    });
    const data = await res.json();
    if (data.error) throw new Error('Failed to refresh token');
    accessToken = data.access_token;
    await supabase.from('clients').update({ google_access_token: accessToken, google_token_expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString() }).eq('id', clientId);
  }
  return accessToken;
}

async function executeQuery(query: string, customerId: string, accessToken: string, devToken: string) {
  console.log(`[DEBUG] GAQL query: ${query}`);
  const url = `https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:searchStream`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'developer-token': devToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const rawText = await res.text();
  console.log(`[DEBUG] Google Ads API status: ${res.status}, response length: ${rawText.length}`);
  console.log(`[DEBUG] Google Ads API raw response (first 2000 chars): ${rawText.substring(0, 2000)}`);
  
  let data;
  try { data = JSON.parse(rawText); } catch (e) { throw new Error(`Failed to parse response: ${rawText.substring(0, 500)}`); }
  
  if (data.error) throw new Error(JSON.stringify(data.error));
  const results: any[] = [];
  if (Array.isArray(data)) {
    for (const batch of data) {
      if (batch.results) results.push(...batch.results);
    }
  }
  console.log(`[DEBUG] Parsed ${results.length} results`);
  return results;
}

function processAggregateMetrics(results: any[]) {
  let cost = 0, impressions = 0, clicks = 0, conversions = 0, conversionValue = 0;
  for (const r of results) {
    const m = r.metrics || {};
    cost += (m.costMicros || 0) / 1_000_000;
    impressions += m.impressions || 0;
    clicks += m.clicks || 0;
    conversions += m.conversions || 0;
    conversionValue += m.conversionsValue || 0;
  }
  return {
    cost, impressions, clicks, conversions, conversion_value: conversionValue,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    average_cpc: clicks > 0 ? cost / clicks : 0,
    average_cpm: impressions > 0 ? (cost / impressions) * 1000 : 0,
    cost_per_conversion: conversions > 0 ? cost / conversions : 0,
    conversion_rate: clicks > 0 ? (conversions / clicks) * 100 : 0,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { client_id, date_preset, date_range, breakdown } = await req.json();
    if (!client_id) return new Response(JSON.stringify({ error: 'client_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const GOOGLE_DEVELOPER_TOKEN = Deno.env.get('GOOGLE_DEVELOPER_TOKEN')!;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_DEVELOPER_TOKEN) throw new Error('Missing configuration');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: client, error: clientError } = await supabase.from('clients').select('google_access_token, google_refresh_token, google_customer_id, google_token_expires_at').eq('id', client_id).single();
    if (clientError || !client) throw new Error('Client not found');
    if (!client.google_access_token || !client.google_customer_id) return new Response(JSON.stringify({ error: 'Google Ads not connected' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const accessToken = await getAccessToken(client, client_id, supabase);
    const customerId = client.google_customer_id.replace(/-/g, '');
    const dateRange = getDateRange(date_preset, date_range);
    const dateFilter = `segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;

    console.log(`Fetching Google Ads (breakdown: ${breakdown || 'aggregate'}) for customer: ${customerId}, ${dateRange.start} to ${dateRange.end}`);

    // === BREAKDOWN: campaign ===
    if (breakdown === 'campaign') {
      const query = `SELECT campaign.name, campaign.id, campaign.status, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.conversions, metrics.conversions_value, metrics.cost_per_conversion FROM campaign WHERE ${dateFilter} AND campaign.status != 'REMOVED' ORDER BY metrics.cost_micros DESC`;
      const results = await executeQuery(query, customerId, accessToken, GOOGLE_DEVELOPER_TOKEN);
      const campaigns = results.map(r => {
        const m = r.metrics || {};
        const cost = (m.costMicros || 0) / 1_000_000;
        const clicks = m.clicks || 0;
        const impressions = m.impressions || 0;
        const conversions = m.conversions || 0;
        return {
          campaign_name: r.campaign?.name || 'Unknown',
          campaign_id: r.campaign?.id,
          status: r.campaign?.status,
          cost, impressions, clicks, conversions,
          conversion_value: m.conversionsValue || 0,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          average_cpc: clicks > 0 ? cost / clicks : 0,
          cost_per_conversion: conversions > 0 ? cost / conversions : 0,
          conversion_rate: clicks > 0 ? (conversions / clicks) * 100 : 0,
        };
      });
      return new Response(JSON.stringify({ campaigns }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === BREAKDOWN: ad_group ===
    if (breakdown === 'ad_group') {
      const query = `SELECT ad_group.name, ad_group.id, campaign.name, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.cost_per_conversion FROM ad_group WHERE ${dateFilter} AND campaign.status != 'REMOVED' AND ad_group.status != 'REMOVED' ORDER BY metrics.cost_micros DESC LIMIT 50`;
      const results = await executeQuery(query, customerId, accessToken, GOOGLE_DEVELOPER_TOKEN);
      const adGroups = results.map(r => {
        const m = r.metrics || {};
        const cost = (m.costMicros || 0) / 1_000_000;
        const clicks = m.clicks || 0;
        const conversions = m.conversions || 0;
        return {
          ad_group_name: r.adGroup?.name || 'Unknown',
          ad_group_id: r.adGroup?.id,
          campaign_name: r.campaign?.name || '',
          cost, impressions: m.impressions || 0, clicks, conversions,
          cost_per_conversion: conversions > 0 ? cost / conversions : 0,
          conversion_rate: clicks > 0 ? (conversions / clicks) * 100 : 0,
        };
      });
      return new Response(JSON.stringify({ ad_groups: adGroups }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === BREAKDOWN: keyword ===
    if (breakdown === 'keyword') {
      const query = `SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, campaign.name, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.ctr, metrics.average_cpc, metrics.cost_per_conversion FROM keyword_view WHERE ${dateFilter} AND campaign.status != 'REMOVED' ORDER BY metrics.cost_micros DESC LIMIT 50`;
      const results = await executeQuery(query, customerId, accessToken, GOOGLE_DEVELOPER_TOKEN);
      const keywords = results.map(r => {
        const m = r.metrics || {};
        const cost = (m.costMicros || 0) / 1_000_000;
        const clicks = m.clicks || 0;
        const impressions = m.impressions || 0;
        const conversions = m.conversions || 0;
        return {
          keyword_text: r.adGroupCriterion?.keyword?.text || 'Unknown',
          match_type: r.adGroupCriterion?.keyword?.matchType || '',
          campaign_name: r.campaign?.name || '',
          cost, impressions, clicks, conversions,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          average_cpc: clicks > 0 ? cost / clicks : 0,
          average_cpm: impressions > 0 ? (cost / impressions) * 1000 : 0,
          cost_per_conversion: conversions > 0 ? cost / conversions : 0,
          conversion_rate: clicks > 0 ? (conversions / clicks) * 100 : 0,
        };
      });
      return new Response(JSON.stringify({ keywords }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === BREAKDOWN: daily ===
    if (breakdown === 'daily') {
      const query = `SELECT segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM customer WHERE ${dateFilter} ORDER BY segments.date ASC`;
      const results = await executeQuery(query, customerId, accessToken, GOOGLE_DEVELOPER_TOKEN);
      const daily = results.map(r => {
        const m = r.metrics || {};
        const cost = (m.costMicros || 0) / 1_000_000;
        return { date: r.segments?.date, cost, impressions: m.impressions || 0, clicks: m.clicks || 0, conversions: m.conversions || 0, conversion_value: m.conversionsValue || 0 };
      });
      return new Response(JSON.stringify({ daily }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === BREAKDOWN: monthly ===
    if (breakdown === 'monthly') {
      const query = `SELECT segments.month, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM customer WHERE ${dateFilter} ORDER BY segments.month ASC`;
      const results = await executeQuery(query, customerId, accessToken, GOOGLE_DEVELOPER_TOKEN);
      const monthly = results.map(r => {
        const m = r.metrics || {};
        const cost = (m.costMicros || 0) / 1_000_000;
        return { month: r.segments?.month, cost, impressions: m.impressions || 0, clicks: m.clicks || 0, conversions: m.conversions || 0, conversion_value: m.conversionsValue || 0 };
      });
      return new Response(JSON.stringify({ monthly }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === BREAKDOWN: day_of_week ===
    if (breakdown === 'day_of_week') {
      const query = `SELECT segments.day_of_week, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM customer WHERE ${dateFilter}`;
      const results = await executeQuery(query, customerId, accessToken, GOOGLE_DEVELOPER_TOKEN);
      const byDay: Record<string, { cost: number; impressions: number; clicks: number; conversions: number }> = {};
      for (const r of results) {
        const m = r.metrics || {};
        const day = r.segments?.dayOfWeek || 'UNKNOWN';
        if (!byDay[day]) byDay[day] = { cost: 0, impressions: 0, clicks: 0, conversions: 0 };
        byDay[day].cost += (m.costMicros || 0) / 1_000_000;
        byDay[day].impressions += m.impressions || 0;
        byDay[day].clicks += m.clicks || 0;
        byDay[day].conversions += m.conversions || 0;
      }
      const dayOfWeek = Object.entries(byDay).map(([day, data]) => ({ day, ...data }));
      return new Response(JSON.stringify({ day_of_week: dayOfWeek }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === DEFAULT: aggregate ===
    const query = `SELECT metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.conversions, metrics.conversions_value, metrics.cost_per_conversion FROM customer WHERE ${dateFilter}`;
    const results = await executeQuery(query, customerId, accessToken, GOOGLE_DEVELOPER_TOKEN);
    const metrics = processAggregateMetrics(results);

    console.log('Successfully fetched Google Ads insights:', JSON.stringify(metrics));
    return new Response(JSON.stringify({ metrics }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error in google-ads-insights:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
