export interface MetaActionMetric {
  action_type: string;
  value: string;
}

export interface MetaInsightsRow {
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  frequency?: string;
  actions?: MetaActionMetric[];
  action_values?: MetaActionMetric[];
  conversions?: MetaActionMetric[];
  [key: string]: unknown;
}

export const META_INSIGHTS_FIELDS =
  "spend,impressions,reach,clicks,cpc,cpm,ctr,frequency,actions,action_values,cost_per_action_type,conversions,conversion_values,cost_per_conversion";

function getFirstActionValue(actions: MetaActionMetric[] | undefined, ...types: string[]): number {
  if (!actions) return 0;

  for (const type of types) {
    const match = actions.find((action) => action.action_type === type);
    if (match) return parseFloat(match.value || "0") || 0;
  }

  return 0;
}

export function extractMetaMetrics(raw: MetaInsightsRow) {
  const spend = parseFloat(raw.spend || "0");
  const pixelLeads = getFirstActionValue(raw.actions, "lead", "offsite_conversion.fb_pixel_lead", "omni_lead");
  const messageLeads = getFirstActionValue(
    raw.actions,
    "onsite_conversion.messaging_conversation_started_7d",
    "onsite_conversion.lead_grouped",
    "onsite_web_lead",
  );
  const formLeads = getFirstActionValue(raw.actions, "leadgen_grouped", "onsite_conversion.lead_grouped");
  const totalLeads = pixelLeads + messageLeads;
  const purchases = getFirstActionValue(
    raw.actions,
    "purchase",
    "offsite_conversion.fb_pixel_purchase",
    "omni_purchase",
  );
  const purchaseValue = getFirstActionValue(
    raw.action_values,
    "purchase",
    "offsite_conversion.fb_pixel_purchase",
    "omni_purchase",
  );
  const addToCart = getFirstActionValue(
    raw.actions,
    "add_to_cart",
    "offsite_conversion.fb_pixel_add_to_cart",
    "omni_add_to_cart",
  );
  const initiateCheckout = getFirstActionValue(
    raw.actions,
    "initiate_checkout",
    "offsite_conversion.fb_pixel_initiate_checkout",
    "omni_initiated_checkout",
  );
  const viewContent = getFirstActionValue(
    raw.actions,
    "view_content",
    "offsite_conversion.fb_pixel_view_content",
    "omni_view_content",
  );
  const completeRegistration = getFirstActionValue(
    raw.actions,
    "complete_registration",
    "offsite_conversion.fb_pixel_complete_registration",
    "omni_complete_registration",
  );
  const linkClicks = getFirstActionValue(raw.actions, "link_click");

  const results = Array.isArray(raw.conversions)
    ? raw.conversions.reduce((sum, conversion) => sum + (parseFloat(conversion.value || "0") || 0), 0)
    : 0;

  return {
    spend,
    impressions: parseInt(raw.impressions || "0", 10),
    reach: parseInt(raw.reach || "0", 10),
    clicks: parseInt(raw.clicks || "0", 10),
    cpc: parseFloat(raw.cpc || "0"),
    cpm: parseFloat(raw.cpm || "0"),
    ctr: parseFloat(raw.ctr || "0"),
    frequency: parseFloat(raw.frequency || "0"),
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
}