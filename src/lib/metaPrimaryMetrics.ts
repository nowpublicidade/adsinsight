// Shared config for Meta Ads primary metric options

export type MetaPrimaryMetricKey =
  | 'leads'
  | 'pixelLeads'
  | 'formLeads'
  | 'results'
  | 'purchases'
  | 'messageLeads'
  | 'completeRegistration'
  | 'addToCart'
  | 'initiateCheckout'
  | 'linkClicks'
  | 'viewContent';

export interface MetricConfig {
  key: MetaPrimaryMetricKey;
  label: string;
  description: string;
  costKey: string;
  costLabel: string;
}

export const META_PRIMARY_METRICS: MetricConfig[] = [
  { key: 'leads', label: 'Leads (Pixel + Mensagens)', description: 'Soma de leads do pixel e mensagens', costKey: 'costPerLead', costLabel: 'Custo por Lead' },
  { key: 'pixelLeads', label: 'Form (Pixel)', description: 'Leads rastreados via Pixel do Meta', costKey: 'costPerPixelLead', costLabel: 'Custo por Form' },
  { key: 'formLeads', label: 'Formulários (Lead Ads)', description: 'Formulários nativos do Meta (Lead Ads)', costKey: 'costPerFormLead', costLabel: 'Custo por Formulário' },
  { key: 'results', label: 'Resultados (Objetivo)', description: 'Total de conversões do objetivo da campanha', costKey: 'costPerResult', costLabel: 'Custo por Resultado' },
  { key: 'purchases', label: 'Compras', description: 'Compras rastreadas pelo pixel', costKey: 'costPerPurchase', costLabel: 'Custo por Compra' },
  { key: 'messageLeads', label: 'Mensagens', description: 'Conversas iniciadas via anúncio', costKey: 'costPerMessage', costLabel: 'Custo por Mensagem' },
  { key: 'completeRegistration', label: 'Registros Completos', description: 'Registros completados no site', costKey: 'costPerRegistration', costLabel: 'Custo por Registro' },
  { key: 'addToCart', label: 'Adicionar ao Carrinho', description: 'Eventos de adicionar ao carrinho', costKey: 'costPerAddToCart', costLabel: 'Custo por Carrinho' },
  { key: 'initiateCheckout', label: 'Iniciar Checkout', description: 'Eventos de início de checkout', costKey: 'costPerCheckout', costLabel: 'Custo por Checkout' },
  { key: 'linkClicks', label: 'Cliques no Link', description: 'Cliques no link do anúncio', costKey: 'costPerLinkClick', costLabel: 'Custo por Clique' },
  { key: 'viewContent', label: 'Visualização de Conteúdo', description: 'Visualizações de conteúdo no site', costKey: 'costPerViewContent', costLabel: 'Custo por Visualização' },
];

export function getMetricConfig(key: string): MetricConfig {
  return META_PRIMARY_METRICS.find(m => m.key === key) || META_PRIMARY_METRICS[0];
}

/** Get the short label for display in KPI cards etc */
export function getMetricLabel(key: string): string {
  return getMetricConfig(key).label;
}

/** Given metrics data object, extract metric value and cost */
export function getMetricValues(metrics: any, metricKey: string): { value: number; cost: number } {
  if (!metrics) return { value: 0, cost: 0 };
  const config = getMetricConfig(metricKey);
  const value = metrics[config.key] ?? 0;
  const cost = metrics[config.costKey] ?? (value > 0 ? (metrics.spend || 0) / value : 0);
  return { value, cost };
}
