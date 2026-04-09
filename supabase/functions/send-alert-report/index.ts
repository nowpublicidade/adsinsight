import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

function getActionValue(actions: Array<{ action_type: string; value: string }> | undefined, types: string[]): number {
  if (!actions) return 0;
  let total = 0;
  for (const a of actions) {
    if (types.includes(a.action_type)) {
      total += parseInt(a.value, 10);
    }
  }
  return total;
}

function aggregateMetrics(rows: MetaInsightsRow[]) {
  let spend = 0, impressions = 0, clicks = 0, reach = 0;
  let pixelLeads = 0, formLeads = 0, messageLeads = 0;
  let purchases = 0, purchaseValue = 0;
  let completeRegistration = 0, addToCart = 0, initiateCheckout = 0;
  let linkClicks = 0, viewContent = 0;
  let results = 0;

  for (const row of rows) {
    spend += parseFloat(row.spend || "0");
    impressions += parseInt(row.impressions || "0", 10);
    clicks += parseInt(row.clicks || "0", 10);
    reach += parseInt(row.reach || "0", 10);

    const actions = row.actions;
    pixelLeads += getActionValue(actions, ["offsite_conversion.fb_pixel_lead", "lead"]);
    formLeads += getActionValue(actions, ["leadgen_grouped", "onsite_conversion.leadgen_grouped"]);
    messageLeads += getActionValue(actions, [
      "onsite_conversion.messaging_first_reply",
      "onsite_conversion.messaging_conversation_started_7d",
    ]);
    purchases += getActionValue(actions, ["offsite_conversion.fb_pixel_purchase", "purchase"]);
    completeRegistration += getActionValue(actions, [
      "offsite_conversion.fb_pixel_complete_registration", "complete_registration",
    ]);
    addToCart += getActionValue(actions, ["offsite_conversion.fb_pixel_add_to_cart", "add_to_cart"]);
    initiateCheckout += getActionValue(actions, [
      "offsite_conversion.fb_pixel_initiate_checkout", "initiate_checkout",
    ]);
    linkClicks += getActionValue(actions, ["link_click"]);
    viewContent += getActionValue(actions, [
      "offsite_conversion.fb_pixel_view_content", "view_content",
    ]);
    results += getActionValue(actions, [
      "offsite_conversion.fb_pixel_lead", "lead",
      "offsite_conversion.fb_pixel_purchase", "purchase",
      "leadgen_grouped", "onsite_conversion.leadgen_grouped",
      "onsite_conversion.messaging_first_reply",
    ]);

    // Purchase value
    if (actions) {
      for (const a of actions) {
        if (["offsite_conversion.fb_pixel_purchase", "purchase"].includes(a.action_type)) {
          // value is count, need action_values for monetary
        }
      }
    }
  }

  const leads = pixelLeads + messageLeads;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const frequency = reach > 0 ? impressions / reach : 0;

  return {
    spend, impressions, clicks, reach, cpc, cpm, ctr, frequency,
    leads, pixelLeads, formLeads, messageLeads,
    purchases, completeRegistration, addToCart, initiateCheckout,
    linkClicks, viewContent, results,
    costPerLead: leads > 0 ? spend / leads : 0,
    costPerPixelLead: pixelLeads > 0 ? spend / pixelLeads : 0,
    costPerFormLead: formLeads > 0 ? spend / formLeads : 0,
    costPerMessage: messageLeads > 0 ? spend / messageLeads : 0,
    costPerPurchase: purchases > 0 ? spend / purchases : 0,
    costPerRegistration: completeRegistration > 0 ? spend / completeRegistration : 0,
    costPerAddToCart: addToCart > 0 ? spend / addToCart : 0,
    costPerCheckout: initiateCheckout > 0 ? spend / initiateCheckout : 0,
    costPerLinkClick: linkClicks > 0 ? spend / linkClicks : 0,
    costPerViewContent: viewContent > 0 ? spend / viewContent : 0,
    costPerResult: results > 0 ? spend / results : 0,
  };
}

function replacePlaceholders(template: string, vars: Record<string, string>): string {
  let msg = template;
  for (const [key, value] of Object.entries(vars)) {
    msg = msg.replaceAll(`{{${key}}}`, value);
  }
  return msg;
}

/** Get current time in America/Sao_Paulo timezone */
function getBrazilNow(): Date {
  const utc = new Date();
  // Create a formatter to get the Brazil time components
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(utc);
  const get = (type: string) => parts.find(p => p.type === type)?.value || "0";
  return new Date(
    parseInt(get("year")),
    parseInt(get("month")) - 1,
    parseInt(get("day")),
    parseInt(get("hour")),
    parseInt(get("minute")),
    parseInt(get("second")),
  );
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
      // Use Brazil timezone for schedule matching
      const now = getBrazilNow();
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const currentDay = days[now.getDay()];
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      console.log(`[CRON] Brazil time: ${currentDay} ${currentTime}`);

      const { data, error } = await supabase
        .from("alert_configs")
        .select("*, clients(name, meta_ad_account_id)")
        .eq("is_active", true)
        .eq("schedule_day", currentDay)
        .gte("schedule_time", currentTime + ":00")
        .lte("schedule_time", currentTime + ":59");

      if (error) console.error("[CRON] Query error:", error.message);
      configs = data || [];
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

        const fields = "campaign_name,spend,impressions,clicks,cpc,cpm,cpp,ctr,reach,actions,cost_per_action_type";
        const timeRange = JSON.stringify({ since, until });
        const metaUrl = `https://graph.facebook.com/v21.0/act_${adAccountId}/insights?time_increment=1&level=ad&limit=3000&time_range=${encodeURIComponent(timeRange)}&fields=${fields}&access_token=${config.meta_token}`;

        const metaRes = await fetch(metaUrl);
        const metaJson = await metaRes.json();

        if (metaJson.error) {
          throw new Error(`Meta API error: ${metaJson.error.message}`);
        }

        let allRows: MetaInsightsRow[] = metaJson.data || [];
        let nextUrl = metaJson.paging?.next;
        while (nextUrl) {
          const nextRes = await fetch(nextUrl);
          const nextJson = await nextRes.json();
          allRows = allRows.concat(nextJson.data || []);
          nextUrl = nextJson.paging?.next;
        }

        const agg = aggregateMetrics(allRows);

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
          meta_data: { aggregated: agg, rows_count: allRows.length },
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
