import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { client_id, date_preset, date_range, breakdown } = await req.json();

    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("meta_access_token, meta_ad_account_id, meta_token_expires_at")
      .eq("id", client_id)
      .single();

    if (clientError || !client) {
      throw new Error("Client not found");
    }

    if (!client.meta_access_token || !client.meta_ad_account_id) {
      return new Response(JSON.stringify({ error: "Meta Ads not connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (client.meta_token_expires_at && new Date(client.meta_token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Meta token expired", code: "TOKEN_EXPIRED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let dateParams = "";
    if (date_preset) {
      dateParams = `&date_preset=${date_preset}`;
    } else if (date_range) {
      dateParams = `&time_range={"since":"${date_range.start}","until":"${date_range.end}"}`;
    } else {
      dateParams = "&date_preset=last_7d";
    }

    const baseFields = [
      "spend",
      "impressions",
      "reach",
      "clicks",
      "cpc",
      "cpm",
      "ctr",
      "frequency",
      "actions",
      "action_values",
      "cost_per_action_type",
      "conversions",
      "conversion_values",
      "cost_per_conversion",
    ].join(",");

    const accessToken = client.meta_access_token;
    const rawAdAccountId = client.meta_ad_account_id;
    const adAccountId = rawAdAccountId.startsWith("act_") ? rawAdAccountId : `act_${rawAdAccountId}`;

    // Helper functions
    const getActionValue = (actions: any[], ...actionTypes: string[]) => {
      if (!actions) return 0;
      for (const actionType of actionTypes) {
        const action = actions.find((a: any) => a.action_type === actionType);
        if (action) return parseFloat(action.value);
      }
      return 0;
    };

    const processMetrics = (rawData: any) => {
      const pixelLeads = getActionValue(rawData.actions, "lead", "offsite_conversion.fb_pixel_lead", "omni_lead");
      const messageLeads = getActionValue(
        rawData.actions,
        "onsite_conversion.messaging_conversation_started_7d",
        "onsite_conversion.lead_grouped",
        "onsite_web_lead",
      );
      const totalLeads = pixelLeads + messageLeads;
      const spend = parseFloat(rawData.spend || 0);
      const purchases = getActionValue(
        rawData.actions,
        "purchase",
        "offsite_conversion.fb_pixel_purchase",
        "omni_purchase",
      );
      const purchaseValue = getActionValue(
        rawData.action_values,
        "purchase",
        "offsite_conversion.fb_pixel_purchase",
        "omni_purchase",
      );
      const addToCart = getActionValue(
        rawData.actions,
        "add_to_cart",
        "offsite_conversion.fb_pixel_add_to_cart",
        "omni_add_to_cart",
      );
      const initiateCheckout = getActionValue(
        rawData.actions,
        "initiate_checkout",
        "offsite_conversion.fb_pixel_initiate_checkout",
        "omni_initiated_checkout",
      );
      const viewContent = getActionValue(
        rawData.actions,
        "view_content",
        "offsite_conversion.fb_pixel_view_content",
        "omni_view_content",
      );
      const completeRegistration = getActionValue(
        rawData.actions,
        "complete_registration",
        "offsite_conversion.fb_pixel_complete_registration",
        "omni_complete_registration",
      );
      const linkClicks = getActionValue(rawData.actions, "link_click");
      const formLeads = getActionValue(rawData.actions, "leadgen_grouped", "onsite_conversion.lead_grouped");

      // Results: sum all values from 'conversions' array (campaign objective results)
      let results = 0;
      if (rawData.conversions && Array.isArray(rawData.conversions)) {
        results = rawData.conversions.reduce((sum: number, c: any) => sum + parseFloat(c.value || 0), 0);
      }

      return {
        spend,
        impressions: parseInt(rawData.impressions || 0),
        reach: parseInt(rawData.reach || 0),
        clicks: parseInt(rawData.clicks || 0),
        cpc: parseFloat(rawData.cpc || 0),
        cpm: parseFloat(rawData.cpm || 0),
        ctr: parseFloat(rawData.ctr || 0),
        frequency: parseFloat(rawData.frequency || 0),
        leads: totalLeads,
        pixelLeads,
        messageLeads,
        costPerLead: totalLeads > 0 ? spend / totalLeads : 0,
        costPerPixelLead: pixelLeads > 0 ? spend / pixelLeads : 0,
        purchases,
        purchaseValue,
        roas: spend > 0 ? purchaseValue / spend : 0,
        costPerPurchase: purchases > 0 ? spend / purchases : 0,
        addToCart,
        costPerAddToCart: addToCart > 0 ? spend / addToCart : 0,
        initiateCheckout,
        costPerCheckout: initiateCheckout > 0 ? spend / initiateCheckout : 0,
        viewContent,
        completeRegistration,
        costPerRegistration: completeRegistration > 0 ? spend / completeRegistration : 0,
        linkClicks,
        costPerLinkClick: linkClicks > 0 ? spend / linkClicks : 0,
        costPerViewContent: viewContent > 0 ? spend / viewContent : 0,
        costPerMessage: messageLeads > 0 ? spend / messageLeads : 0,
        formLeads,
        costPerFormLead: formLeads > 0 ? spend / formLeads : 0,
        results,
        costPerResult: results > 0 ? spend / results : 0,
      };
    };

    // === BREAKDOWN: campaign ===
    if (breakdown === "campaign") {
      // Busca insights e status das campanhas em paralelo (2 requests, não N)
      const [insightsRes, statusRes] = await Promise.all([
        fetch(
          `https://graph.facebook.com/v24.0/${adAccountId}/insights?fields=campaign_name,campaign_id,${baseFields}${dateParams}&level=campaign&limit=50&access_token=${accessToken}`,
        ),
        fetch(
          `https://graph.facebook.com/v24.0/${adAccountId}/campaigns?fields=id,effective_status&limit=100&access_token=${accessToken}`,
        ),
      ]);
      const insightsData = await insightsRes.json();
      const statusData = await statusRes.json();
      if (insightsData.error) throw new Error(insightsData.error.message);

      // Monta mapa de id -> effective_status
      const statusMap: Record<string, string> = {};
      for (const c of statusData.data || []) {
        statusMap[c.id] = c.effective_status;
      }

      const campaigns = (insightsData.data || []).map((row: any) => ({
        campaign_name: row.campaign_name,
        campaign_id: row.campaign_id,
        effective_status: statusMap[row.campaign_id] || null,
        ...processMetrics(row),
      }));

      return new Response(JSON.stringify({ campaigns }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === BREAKDOWN: ad (with creative previews + status) ===
    if (breakdown === "ad") {
      // Busca insights e status dos anúncios em paralelo (2 requests fixos, não N)
      const [insightsRes, statusRes] = await Promise.all([
        fetch(
          `https://graph.facebook.com/v24.0/${adAccountId}/insights?fields=ad_name,ad_id,campaign_name,${baseFields}${dateParams}&level=ad&limit=50&access_token=${accessToken}`,
        ),
        fetch(
          `https://graph.facebook.com/v24.0/${adAccountId}/ads?fields=id,effective_status,creative{thumbnail_url,image_url}&limit=100&access_token=${accessToken}`,
        ),
      ]);
      const insightsData = await insightsRes.json();
      const statusData = await statusRes.json();
      if (insightsData.error) throw new Error(insightsData.error.message);

      // Monta mapa de id -> { effective_status, thumbnail_url }
      const adMap: Record<string, { effective_status: string | null; thumbnail_url: string | null }> = {};
      for (const a of statusData.data || []) {
        adMap[a.id] = {
          effective_status: a.effective_status || null,
          thumbnail_url: a.creative?.image_url || a.creative?.thumbnail_url || null,
        };
      }

      const ads = (insightsData.data || []).map((row: any) => ({
        ad_name: row.ad_name,
        ad_id: row.ad_id,
        campaign_name: row.campaign_name,
        thumbnail_url: adMap[row.ad_id]?.thumbnail_url || null,
        effective_status: adMap[row.ad_id]?.effective_status || null,
        ...processMetrics(row),
      }));

      return new Response(JSON.stringify({ ads }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === BREAKDOWN: daily ===
    if (breakdown === "daily") {
      const url = `https://graph.facebook.com/v24.0/${adAccountId}/insights?fields=${baseFields}${dateParams}&time_increment=1&limit=90&access_token=${accessToken}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const daily = (data.data || []).map((row: any) => ({
        date_start: row.date_start,
        date_stop: row.date_stop,
        ...processMetrics(row),
      }));

      return new Response(JSON.stringify({ daily }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === BREAKDOWN: demographics (age, gender) ===
    if (breakdown === "age_gender") {
      const url = `https://graph.facebook.com/v24.0/${adAccountId}/insights?fields=${baseFields}${dateParams}&breakdowns=age,gender&limit=100&access_token=${accessToken}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const demographics = (data.data || []).map((row: any) => ({
        age: row.age,
        gender: row.gender,
        ...processMetrics(row),
      }));

      return new Response(JSON.stringify({ demographics }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === BREAKDOWN: publisher_platform ===
    if (breakdown === "publisher_platform") {
      const url = `https://graph.facebook.com/v24.0/${adAccountId}/insights?fields=${baseFields}${dateParams}&breakdowns=publisher_platform&limit=20&access_token=${accessToken}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const platforms = (data.data || []).map((row: any) => ({
        publisher_platform: row.publisher_platform,
        ...processMetrics(row),
      }));

      return new Response(JSON.stringify({ platforms }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === BREAKDOWN: platform_position ===
    if (breakdown === "platform_position") {
      const url = `https://graph.facebook.com/v24.0/${adAccountId}/insights?fields=${baseFields}${dateParams}&breakdowns=publisher_platform,platform_position&limit=50&access_token=${accessToken}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const positions = (data.data || []).map((row: any) => ({
        publisher_platform: row.publisher_platform,
        platform_position: row.platform_position,
        ...processMetrics(row),
      }));

      return new Response(JSON.stringify({ positions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === DEFAULT: aggregate metrics ===
    const insightsUrl = `https://graph.facebook.com/v24.0/${adAccountId}/insights?fields=${baseFields}${dateParams}&access_token=${accessToken}`;
    const insightsResponse = await fetch(insightsUrl);
    const insightsData = await insightsResponse.json();

    if (insightsData.error) {
      console.error("Meta API error:", insightsData.error);
      throw new Error(insightsData.error.message || "Failed to fetch insights");
    }

    const rawData = insightsData.data?.[0] || {};
    const metrics = processMetrics(rawData);

    return new Response(JSON.stringify({ metrics, raw: rawData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in meta-ads-insights:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
