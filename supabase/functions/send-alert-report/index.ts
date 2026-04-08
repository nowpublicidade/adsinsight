import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getDateRange(period: string): { since: string; until: string } {
  const now = new Date();
  const until = new Date(now);
  until.setDate(until.getDate() - 1); // yesterday

  let daysBack = 7;
  switch (period) {
    case "ontem": daysBack = 1; break;
    case "hoje": daysBack = 0; break;
    case "3dias": daysBack = 3; break;
    case "7dias": daysBack = 7; break;
    case "15dias": daysBack = 15; break;
    case "30dias": daysBack = 30; break;
    case "60dias": daysBack = 60; break;
    case "90dias": daysBack = 90; break;
    case "6meses": daysBack = 180; break;
    case "1ano": daysBack = 365; break;
    default: daysBack = 7;
  }

  const since = new Date(now);
  since.setDate(since.getDate() - daysBack);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  if (period === "hoje") {
    return { since: fmt(now), until: fmt(now) };
  }

  return { since: fmt(since), until: fmt(until) };
}

function formatCurrency(val: number): string {
  return `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(val: number): string {
  return val.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

interface MetaInsightsRow {
  spend?: string;
  impressions?: string;
  clicks?: string;
  cpc?: string;
  cpm?: string;
  cpp?: string;
  ctr?: string;
  reach?: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
  campaign_name?: string;
  [key: string]: unknown;
}

function aggregateMetrics(rows: MetaInsightsRow[]) {
  let spend = 0, impressions = 0, clicks = 0, reach = 0;
  let leads = 0, costPerLead = 0;

  for (const row of rows) {
    spend += parseFloat(row.spend || "0");
    impressions += parseInt(row.impressions || "0", 10);
    clicks += parseInt(row.clicks || "0", 10);
    reach += parseInt(row.reach || "0", 10);

    if (row.actions) {
      for (const a of row.actions) {
        if (a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped") {
          leads += parseInt(a.value, 10);
        }
      }
    }
  }

  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  costPerLead = leads > 0 ? spend / leads : 0;

  return { spend, impressions, clicks, reach, leads, cpc, cpm, ctr, cost_per_lead: costPerLead };
}

function replacePlaceholders(template: string, vars: Record<string, string>): string {
  let msg = template;
  for (const [key, value] of Object.entries(vars)) {
    msg = msg.replaceAll(`{{${key}}}`, value);
  }
  return msg;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { alert_config_id, send_all } = body as { alert_config_id?: string; send_all?: boolean };

    let configs: any[] = [];

    if (send_all) {
      // Called by cron — find alerts matching current day/time
      const now = new Date();
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const currentDay = days[now.getUTCDay()];
      const currentTime = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;

      const { data } = await supabase
        .from("alert_configs")
        .select("*, clients(name, meta_ad_account_id)")
        .eq("is_active", true)
        .eq("schedule_day", currentDay)
        .gte("schedule_time", currentTime + ":00")
        .lte("schedule_time", currentTime + ":59");

      configs = data || [];
    } else if (alert_config_id) {
      const { data } = await supabase
        .from("alert_configs")
        .select("*, clients(name, meta_ad_account_id)")
        .eq("id", alert_config_id)
        .single();

      if (data) configs = [data];
    }

    if (configs.length === 0) {
      return new Response(JSON.stringify({ message: "No alerts to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const config of configs) {
      try {
        const adAccountId = config.clients?.meta_ad_account_id;
        if (!adAccountId) {
          throw new Error("Cliente sem conta de anúncios Meta configurada");
        }

        const { since, until } = getDateRange(config.report_period);
        const selectedMetrics: string[] = config.selected_metrics || [];

        // Fetch Meta insights
        const fields = "campaign_name,spend,impressions,clicks,cpc,cpm,cpp,ctr,reach,actions,cost_per_action_type";
        const timeRange = JSON.stringify({ since, until });
        const metaUrl = `https://graph.facebook.com/v21.0/act_${adAccountId}/insights?time_increment=1&level=ad&limit=3000&time_range=${encodeURIComponent(timeRange)}&fields=${fields}&access_token=${config.meta_token}`;

        const metaRes = await fetch(metaUrl);
        const metaJson = await metaRes.json();

        if (metaJson.error) {
          throw new Error(`Meta API error: ${metaJson.error.message}`);
        }

        // Paginate if needed
        let allRows: MetaInsightsRow[] = metaJson.data || [];
        let nextUrl = metaJson.paging?.next;
        while (nextUrl) {
          const nextRes = await fetch(nextUrl);
          const nextJson = await nextRes.json();
          allRows = allRows.concat(nextJson.data || []);
          nextUrl = nextJson.paging?.next;
        }

        const agg = aggregateMetrics(allRows);

        // Build variables map
        const vars: Record<string, string> = {
          spend: formatCurrency(agg.spend),
          impressions: formatNumber(agg.impressions),
          clicks: formatNumber(agg.clicks),
          cpc: formatCurrency(agg.cpc),
          cpm: formatCurrency(agg.cpm),
          ctr: `${agg.ctr.toFixed(2)}%`,
          reach: formatNumber(agg.reach),
          leads: formatNumber(agg.leads),
          cost_per_lead: formatCurrency(agg.cost_per_lead),
          period: `${since} a ${until}`,
          client_name: config.clients?.name || "",
        };

        const finalMessage = replacePlaceholders(config.message_template, vars);

        // Send via WhatsApp
        const waUrl = `${config.whatsapp_api_url}/message/sendText/${config.whatsapp_instance_name}`;
        const waRes = await fetch(waUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: config.whatsapp_api_key,
          },
          body: JSON.stringify({
            number: config.recipient_number,
            text: finalMessage,
          }),
        });

        const waJson = await waRes.json().catch(() => ({}));

        // Log success
        await supabase.from("alert_logs").insert({
          alert_config_id: config.id,
          client_id: config.client_id,
          status: "success",
          meta_data: { aggregated: agg, rows_count: allRows.length },
          message_sent: finalMessage,
        });

        results.push({ id: config.id, status: "success" });
      } catch (err: any) {
        // Log error
        await supabase.from("alert_logs").insert({
          alert_config_id: config.id,
          client_id: config.client_id,
          status: "error",
          error_message: err.message,
        });

        results.push({ id: config.id, status: "error", error: err.message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
