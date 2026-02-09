import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id, date_from, date_to, breakdown } = await req.json();

    if (!client_id) {
      return new Response(JSON.stringify({ error: 'client_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('ga_access_token, ga_refresh_token, ga_token_expires_at, ga_property_id')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      return new Response(JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!client.ga_access_token || !client.ga_property_id) {
      return new Response(JSON.stringify({ error: 'Google Analytics not connected or property ID not set' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let accessToken = client.ga_access_token;

    // Refresh token if expired
    if (client.ga_token_expires_at && new Date(client.ga_token_expires_at) < new Date()) {
      if (!client.ga_refresh_token) throw new Error('No refresh token available');
      const tokenData = await refreshAccessToken(client.ga_refresh_token, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
      accessToken = tokenData.access_token;
      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);
      await supabase.from('clients').update({
        ga_access_token: accessToken,
        ga_token_expires_at: expiresAt.toISOString(),
      }).eq('id', client_id);
    }

    const propertyId = client.ga_property_id;
    const startDate = date_from || '30daysAgo';
    const endDate = date_to || 'today';

    // Build request based on breakdown
    let requestBody: any;

    if (breakdown === 'daily') {
      requestBody = {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'sessions' },
          { name: 'newUsers' },
          { name: 'totalUsers' },
          { name: 'engagementRate' },
          { name: 'eventCount' },
          { name: 'averageSessionDuration' },
        ],
        dimensions: [{ name: 'date' }],
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
      };
    } else if (breakdown === 'source') {
      requestBody = {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'sessions' },
          { name: 'newUsers' },
          { name: 'totalUsers' },
          { name: 'engagementRate' },
          { name: 'eventCount' },
        ],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 50,
      };
    } else if (breakdown === 'page') {
      requestBody = {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'averageSessionDuration' },
          { name: 'engagementRate' },
        ],
        dimensions: [{ name: 'pagePath' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 50,
      };
    } else if (breakdown === 'city') {
      requestBody = {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'sessions' },
          { name: 'newUsers' },
          { name: 'totalUsers' },
        ],
        dimensions: [{ name: 'city' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 30,
      };
    } else if (breakdown === 'device') {
      requestBody = {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'sessions' },
          { name: 'newUsers' },
          { name: 'engagementRate' },
        ],
        dimensions: [{ name: 'deviceCategory' }],
      };
    } else if (breakdown === 'browser') {
      requestBody = {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'sessions' },
          { name: 'newUsers' },
        ],
        dimensions: [{ name: 'browser' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      };
    } else if (breakdown === 'monthly') {
      requestBody = {
        dateRanges: [{ startDate: '365daysAgo', endDate: 'today' }],
        metrics: [
          { name: 'sessions' },
          { name: 'newUsers' },
          { name: 'totalUsers' },
          { name: 'engagementRate' },
          { name: 'eventCount' },
          { name: 'averageSessionDuration' },
        ],
        dimensions: [{ name: 'yearMonth' }],
        orderBys: [{ dimension: { dimensionName: 'yearMonth' }, desc: false }],
      };
    } else {
      // Overview - summary metrics
      requestBody = {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'sessions' },
          { name: 'newUsers' },
          { name: 'totalUsers' },
          { name: 'engagementRate' },
          { name: 'eventCount' },
          { name: 'averageSessionDuration' },
          { name: 'sessionsPerUser' },
          { name: 'engagedSessions' },
          { name: 'screenPageViews' },
        ],
      };
    }

    const gaResponse = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    const gaData = await gaResponse.json();

    if (gaData.error) {
      console.error('GA4 API error:', gaData.error);
      throw new Error(gaData.error.message || 'GA4 API error');
    }

    // Parse response
    const rows = gaData.rows || [];
    const metricHeaders = gaData.metricHeaders || [];
    const dimensionHeaders = gaData.dimensionHeaders || [];

    let result: any;

    if (!breakdown || breakdown === 'overview') {
      // Single row summary
      const metrics: Record<string, number> = {};
      if (rows.length > 0) {
        metricHeaders.forEach((h: any, i: number) => {
          const val = rows[0].metricValues[i].value;
          metrics[h.name] = h.type === 'TYPE_FLOAT' || h.type === 'TYPE_SECONDS'
            ? parseFloat(val)
            : parseInt(val);
        });
      }
      result = { metrics };
    } else {
      // Dimensional data
      const data = rows.map((row: any) => {
        const item: Record<string, any> = {};
        dimensionHeaders.forEach((h: any, i: number) => {
          item[h.name] = row.dimensionValues[i].value;
        });
        metricHeaders.forEach((h: any, i: number) => {
          const val = row.metricValues[i].value;
          item[h.name] = h.type === 'TYPE_FLOAT' || h.type === 'TYPE_SECONDS'
            ? parseFloat(val)
            : parseInt(val);
        });
        return item;
      });
      result = { data };
    }

    return new Response(JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in google-analytics-insights:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
