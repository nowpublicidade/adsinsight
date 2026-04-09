import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { extractMetaMetrics, META_INSIGHTS_FIELDS } from "../_shared/metaMetrics.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getDateRange(period: string): { since: string; until: string } {
  const now = new Date();
  const until = new Date(now);
  until.setDate(until.getDate() - 1);

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

function replacePlaceholders(template: string, vars: Record<string, string>): string {
  let msg = template;
  for (const [key, value] of Object.entries(vars)) {
    msg = msg.replaceAll(`{{${key}}}`, value);
  }
  return msg;
}

function getBrazilDateTimeParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value || "0";
  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}:${get("second")}`,
    weekday: get("weekday").toLowerCase(),
    hour,
    minute,
  };
}

function formatTimeFromMinutes(totalMinutes: number, second: "00" | "59") {
  const safeMinutes = Math.max(0, Math.min(totalMinutes, 23 * 60 + 59));
  const hour = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${second}`;
}

function wasAlreadySentForSlot(logs: Array<{ sent_at: string }>, scheduleTime: string, currentBrazilDate: string) {
  return logs.some((log) => {
    const sentParts = getBrazilDateTimeParts(new Date(log.sent_at));
    return sentParts.date === currentBrazilDate && sentParts.time >= scheduleTime;
  });
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
      const now = getBrazilDateTimeParts();
      const currentMinuteOfDay = now.hour * 60 + now.minute;
      const windowStart = formatTimeFromMinutes(Math.max(currentMinuteOfDay - 1, 0), "00");
      const windowEnd = formatTimeFromMinutes(currentMinuteOfDay, "59");

      console.log(`[CRON] Brazil time: ${now.weekday} ${now.time}`);
      console.log(`[CRON] Matching window: ${windowStart} -> ${windowEnd}`);

      const { data, error } = await supabase
        .from("alert_configs")
        .select("*, clients(name, meta_ad_account_id)")
        .eq("is_active", true)
        .eq("schedule_day", now.weekday)
        .gte("schedule_time", windowStart)
        .lte("schedule_time", windowEnd);

      if (error) console.error("[CRON] Query error:", error.message);
      const candidates = data || [];

      if (candidates.length > 0) {
        const { data: recentLogs, error: logsError } = await supabase
          .from("alert_logs")
          .select("alert_config_id, sent_at")
          .in("alert_config_id", candidates.map((config) => config.id))
          .gte("sent_at", new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString());

        if (logsError) {
          console.error("[CRON] Logs query error:", logsError.message);
        }

        configs = candidates.filter((config) => {
          const configLogs = (recentLogs || []).filter((log) => log.alert_config_id === config.id);
          const alreadySent = wasAlreadySentForSlot(configLogs, config.schedule_time, now.date);

          if (alreadySent) {
            console.log(`[CRON] Skipping ${config.id}: already sent for this time slot`);
          }

          return !alreadySent;
        });
      }

      console.log(`[CRON] Found ${configs.length} alerts to send`);
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

        const fields = META_INSIGHTS_FIELDS;
        const timeRange = JSON.stringify({ since, until });
        const normalizedAccountId = String(adAccountId).startsWith("act_") ? adAccountId : `act_${adAccountId}`;
        const metaUrl = `https://graph.facebook.com/v24.0/${normalizedAccountId}/insights?time_range=${encodeURIComponent(timeRange)}&fields=${fields}&access_token=${config.meta_token}`;

        const metaRes = await fetch(metaUrl);
        const metaJson = await metaRes.json();

        if (metaJson.error) {
          throw new Error(`Meta API error: ${metaJson.error.message}`);
        }

        const rawMetrics = metaJson.data?.[0] || {};
        const agg = extractMetaMetrics(rawMetrics);

        // Build full variables map
        const vars: Record<string, string> = {
          spend: formatCurrency(agg.spend),
          impressions: formatNumber(agg.impressions),
          clicks: formatNumber(agg.clicks),
          cpc: formatCurrency(agg.cpc),
          cpm: formatCurrency(agg.cpm),
          ctr: `${agg.ctr.toFixed(2)}%`,
          reach: formatNumber(agg.reach),
          frequency: agg.frequency.toFixed(2),
          leads: formatNumber(agg.leads),
          cost_per_lead: formatCurrency(agg.costPerLead),
          pixel_leads: formatNumber(agg.pixelLeads),
          cost_per_pixel_lead: formatCurrency(agg.costPerPixelLead),
          form_leads: formatNumber(agg.formLeads),
          cost_per_form_lead: formatCurrency(agg.costPerFormLead),
          message_leads: formatNumber(agg.messageLeads),
          cost_per_message: formatCurrency(agg.costPerMessage),
          purchases: formatNumber(agg.purchases),
          cost_per_purchase: formatCurrency(agg.costPerPurchase),
          complete_registration: formatNumber(agg.completeRegistration),
          cost_per_registration: formatCurrency(agg.costPerRegistration),
          add_to_cart: formatNumber(agg.addToCart),
          cost_per_add_to_cart: formatCurrency(agg.costPerAddToCart),
          initiate_checkout: formatNumber(agg.initiateCheckout),
          cost_per_checkout: formatCurrency(agg.costPerCheckout),
          link_clicks: formatNumber(agg.linkClicks),
          cost_per_link_click: formatCurrency(agg.costPerLinkClick),
          view_content: formatNumber(agg.viewContent),
          cost_per_view_content: formatCurrency(agg.costPerViewContent),
          results: formatNumber(agg.results),
          cost_per_result: formatCurrency(agg.costPerResult),
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

        await supabase.from("alert_logs").insert({
          alert_config_id: config.id,
          client_id: config.client_id,
          status: "success",
          meta_data: { aggregated: agg, raw: rawMetrics, rows_count: Array.isArray(metaJson.data) ? metaJson.data.length : 0 },
          message_sent: finalMessage,
        });

        results.push({ id: config.id, status: "success" });
      } catch (err: any) {
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
