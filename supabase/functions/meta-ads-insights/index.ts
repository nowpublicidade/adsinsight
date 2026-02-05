import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get client data with tokens
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('meta_access_token, meta_ad_account_id, meta_token_expires_at')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    if (!client.meta_access_token || !client.meta_ad_account_id) {
      return new Response(
        JSON.stringify({ error: 'Meta Ads not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    if (client.meta_token_expires_at && new Date(client.meta_token_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Meta token expired', code: 'TOKEN_EXPIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build date parameters
    let dateParams = '';
    if (date_preset) {
      dateParams = `&date_preset=${date_preset}`;
    } else if (date_range) {
      dateParams = `&time_range={"since":"${date_range.start}","until":"${date_range.end}"}`;
    } else {
      dateParams = '&date_preset=last_7d';
    }

    // Fields to fetch including Pixel/conversion metrics
    const fields = [
      'spend',
      'impressions',
      'reach',
      'clicks',
      'cpc',
      'cpm',
      'ctr',
      'frequency',
      'actions',
      'action_values',
      'cost_per_action_type',
      'conversions',
      'conversion_values',
      'cost_per_conversion',
    ].join(',');

    // Fetch insights from Meta Ads API
    console.log('Fetching insights for ad account:', client.meta_ad_account_id);
    const insightsUrl = `https://graph.facebook.com/v24.0/${client.meta_ad_account_id}/insights?fields=${fields}${dateParams}&access_token=${client.meta_access_token}`;
    
    const insightsResponse = await fetch(insightsUrl);
    const insightsData = await insightsResponse.json();

    if (insightsData.error) {
      console.error('Meta API error:', insightsData.error);
      throw new Error(insightsData.error.message || 'Failed to fetch insights');
    }

    // Process the data
    const rawData = insightsData.data?.[0] || {};
    
    // Helper to find action value - checks multiple action_type variations
    const getActionValue = (actions: any[], ...actionTypes: string[]) => {
      if (!actions) return 0;
      for (const actionType of actionTypes) {
        const action = actions.find((a: any) => a.action_type === actionType);
        if (action) return parseFloat(action.value);
      }
      return 0;
    };

    // Helper to find action cost - checks multiple action_type variations
    const getActionCost = (costs: any[], ...actionTypes: string[]) => {
      if (!costs) return 0;
      for (const actionType of actionTypes) {
        const cost = costs.find((c: any) => c.action_type === actionType);
        if (cost) return parseFloat(cost.value);
      }
      return 0;
    };

    // Extract Pixel metrics - check multiple action_type variations
    const purchases = getActionValue(rawData.actions, 
      'purchase', 
      'offsite_conversion.fb_pixel_purchase',
      'omni_purchase'
    );
    const purchaseValue = getActionValue(rawData.action_values, 
      'purchase',
      'offsite_conversion.fb_pixel_purchase',
      'omni_purchase'
    );
    const addToCart = getActionValue(rawData.actions, 
      'add_to_cart',
      'offsite_conversion.fb_pixel_add_to_cart',
      'omni_add_to_cart'
    );
    const initiateCheckout = getActionValue(rawData.actions, 
      'initiate_checkout',
      'offsite_conversion.fb_pixel_initiate_checkout',
      'omni_initiated_checkout'
    );
    const viewContent = getActionValue(rawData.actions, 
      'view_content',
      'offsite_conversion.fb_pixel_view_content',
      'omni_view_content'
    );
    const completeRegistration = getActionValue(rawData.actions, 
      'complete_registration',
      'offsite_conversion.fb_pixel_complete_registration',
      'omni_complete_registration'
    );
    
    // Leads - check all possible lead action types
    const pixelLeads = getActionValue(rawData.actions, 
      'lead',
      'offsite_conversion.fb_pixel_lead',
      'omni_lead'
    );
    const messageLeads = getActionValue(rawData.actions, 
      'onsite_conversion.messaging_conversation_started_7d',
      'onsite_conversion.lead_grouped',
      'onsite_web_lead'
    );
    
    // Total leads = pixel leads + message leads
    const totalLeads = pixelLeads + messageLeads;
    
    const spend = parseFloat(rawData.spend || 0);
    
    // Calculate derived metrics
    const roas = spend > 0 ? purchaseValue / spend : 0;
    const costPerPurchase = purchases > 0 ? spend / purchases : 0;
    const costPerAddToCart = addToCart > 0 ? spend / addToCart : 0;
    const costPerCheckout = initiateCheckout > 0 ? spend / initiateCheckout : 0;
    const costPerRegistration = completeRegistration > 0 ? spend / completeRegistration : 0;
    const costPerLead = totalLeads > 0 ? spend / totalLeads : 0;
    const costPerPixelLead = pixelLeads > 0 ? spend / pixelLeads : 0;

    const metrics = {
      // General metrics
      spend,
      impressions: parseInt(rawData.impressions || 0),
      reach: parseInt(rawData.reach || 0),
      clicks: parseInt(rawData.clicks || 0),
      cpc: parseFloat(rawData.cpc || 0),
      cpm: parseFloat(rawData.cpm || 0),
      ctr: parseFloat(rawData.ctr || 0),
      frequency: parseFloat(rawData.frequency || 0),
      
      // Lead metrics
      leads: totalLeads,
      pixelLeads,          // Leads specifically from Pixel
      messageLeads,
      costPerLead,
      costPerPixelLead,
      
      // Pixel/Conversion metrics
      purchases,
      purchaseValue,
      roas,
      costPerPurchase,
      addToCart,
      costPerAddToCart,
      initiateCheckout,
      costPerCheckout,
      viewContent,
      completeRegistration,
      costPerRegistration,
    };

    console.log('Successfully fetched Meta Ads insights:', JSON.stringify({
      pixelLeads,
      messageLeads,
      totalLeads,
      rawActions: rawData.actions?.map((a: any) => a.action_type)
    }));

    return new Response(
      JSON.stringify({ metrics, raw: rawData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in meta-ads-insights:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
