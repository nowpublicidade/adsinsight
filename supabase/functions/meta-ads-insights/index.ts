import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractMetaMetrics, META_INSIGHTS_FIELDS } from "../_shared/metaMetrics.ts";

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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase configuration");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("meta_access_token, meta_ad_account_id, meta_token_expires_at")
      .eq("id", client_id)
      .single();

    if (clientError || !client) throw new Error("Client not found");
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

    let dateParams = "&date_preset=last_7d";
    if (date_preset) {
      dateParams = `&date_preset=${date_preset}`;
    } else if (date_range) {
      dateParams = `&time_range={"since":"${date_range.start}","until":"${date_range.end}"}`;
    }

    const baseFields = META_INSIGHTS_FIELDS;
    const accessToken = client.meta_access_token;
    const rawAdAccountId = client.meta_ad_account_id;
    const adAccountId = rawAdAccountId.startsWith("act_") ? rawAdAccountId : `act_${rawAdAccountId}`;

    // ── BREAKDOWN: campaign ───────────────────────────────────────────────────
    if (breakdown === "campaign") {
      // 1. Busca insights agregados por campanha
      const insightsUrl = `https://graph.facebook.com/v24.0/${adAccountId}/insights?fields=campaign_name,campaign_id,${baseFields}${dateParams}&level=campaign&limit=50&access_token=${accessToken}`;
      const insightsRes = await fetch(insightsUrl);
      const insightsData = await insightsRes.json();
      if (insightsData.error) throw new Error(insightsData.error.message);

      const rows: any[] = insightsData.data || [];

      // 2. Para cada campanha nos insights, busca o effective_status individualmente
      //    Esse endpoint SEMPRE retorna o status independente do período
      const campaigns = await Promise.all(
        rows.map(async (row: any) => {
          let effective_status: string | null = null;
          try {
            const statusUrl = `https://graph.facebook.com/v24.0/${row.campaign_id}?fields=effective_status&access_token=${accessToken}`;
            const statusRes = await fetch(statusUrl);
            const statusJson = await statusRes.json();
            console.log(`[DEBUG] campaign ${row.campaign_id} status response:`, JSON.stringify(statusJson));
            effective_status = statusJson.effective_status ?? null;
          } catch (e) {
            console.error(`[DEBUG] failed to fetch status for campaign ${row.campaign_id}:`, e);
          }
          return {
            campaign_name: row.campaign_name,
            campaign_id: row.campaign_id,
            effective_status,
            ...extractMetaMetrics(row),
          };
        }),
      );

      return new Response(JSON.stringify({ campaigns }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── BREAKDOWN: ad ─────────────────────────────────────────────────────────
    if (breakdown === "ad") {
      // 1. Busca insights agregados por anúncio
      const insightsUrl = `https://graph.facebook.com/v24.0/${adAccountId}/insights?fields=ad_name,ad_id,campaign_name,${baseFields}${dateParams}&level=ad&limit=50&access_token=${accessToken}`;
      const insightsRes = await fetch(insightsUrl);
      const insightsData = await insightsRes.json();
      if (insightsData.error) throw new Error(insightsData.error.message);

      const rows: any[] = insightsData.data || [];

      // 2. Para cada anúncio nos insights, busca effective_status + creative individualmente
      const ads = await Promise.all(
        rows.map(async (row: any) => {
          let effective_status: string | null = null;
          let thumbnail_url: string | null = null;
          try {
            const detailUrl = `https://graph.facebook.com/v24.0/${row.ad_id}?fields=effective_status,creative{thumbnail_url,image_url}&access_token=${accessToken}`;
            const detailRes = await fetch(detailUrl);
            const detailJson = await detailRes.json();
            console.log(`[DEBUG] ad ${row.ad_id} detail response:`, JSON.stringify(detailJson));
            effective_status = detailJson.effective_status ?? null;
            thumbnail_url = detailJson.creative?.image_url || detailJson.creative?.thumbnail_url || null;
          } catch (e) {
            console.error(`[DEBUG] failed to fetch detail for ad ${row.ad_id}:`, e);
          }
          return {
            ad_name: row.ad_name,
            ad_id: row.ad_id,
            campaign_name: row.campaign_name,
            effective_status,
            thumbnail_url,
            ...extractMetaMetrics(row),
          };
        }),
      );

      return new Response(JSON.stringify({ ads }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── BREAKDOWN: daily ──────────────────────────────────────────────────────
    if (breakdown === "daily") {
      const url = `https://graph.facebook.com/v24.0/${adAccountId}/insights?fields=${baseFields}${dateParams}&time_increment=1&limit=90&access_token=${accessToken}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const daily = (data.data || []).map((row: any) => ({
        date_start: row.date_start,
        date_stop: row.date_stop,
        ...extractMetaMetrics(row),
      }));
      return new Response(JSON.stringify({ daily }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── BREAKDOWN: age_gender ─────────────────────────────────────────────────
    if (breakdown === "age_gender") {
      const url = `https://graph.facebook.com/v24.0/${adAccountId}/insights?fields=${baseFields}${dateParams}&breakdowns=age,gender&limit=100&access_token=${accessToken}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const demographics = (data.data || []).map((row: any) => ({
        age: row.age,
        gender: row.gender,
        ...extractMetaMetrics(row),
      }));
      return new Response(JSON.stringify({ demographics }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── BREAKDOWN: publisher_platform ─────────────────────────────────────────
    if (breakdown === "publisher_platform") {
      const url = `https://graph.facebook.com/v24.0/${adAccountId}/insights?fields=${baseFields}${dateParams}&breakdowns=publisher_platform&limit=20&access_token=${accessToken}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const platforms = (data.data || []).map((row: any) => ({
        publisher_platform: row.publisher_platform,
        ...extractMetaMetrics(row),
      }));
      return new Response(JSON.stringify({ platforms }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── BREAKDOWN: platform_position ──────────────────────────────────────────
    if (breakdown === "platform_position") {
      const url = `https://graph.facebook.com/v24.0/${adAccountId}/insights?fields=${baseFields}${dateParams}&breakdowns=publisher_platform,platform_position&limit=50&access_token=${accessToken}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const positions = (data.data || []).map((row: any) => ({
        publisher_platform: row.publisher_platform,
        platform_position: row.platform_position,
        ...extractMetaMetrics(row),
      }));
      return new Response(JSON.stringify({ positions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DEFAULT: aggregate ────────────────────────────────────────────────────
    const insightsUrl = `https://graph.facebook.com/v24.0/${adAccountId}/insights?fields=${baseFields}${dateParams}&access_token=${accessToken}`;
    const insightsResponse = await fetch(insightsUrl);
    const insightsData = await insightsResponse.json();
    if (insightsData.error) throw new Error(insightsData.error.message || "Failed to fetch insights");
    const metrics = extractMetaMetrics(insightsData.data?.[0] || {});
    return new Response(JSON.stringify({ metrics, raw: insightsData.data?.[0] || {} }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in meta-ads-insights:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
