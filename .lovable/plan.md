

# Plano de Correção: Dados do Google Ads no Dashboard

## Problemas Identificados

### Problema 1: Incompatibilidade de Nomes de Métricas

Os widgets configurados usam chaves diferentes das que a Edge Function retorna:

| Widget (ReportEditor) | Edge Function Retorna | Status |
|-----------------------|------------------------|--------|
| `cost` | `spend` | Incompatível |
| `average_cpc` | `cpc` | Incompatível |
| `average_cpm` | Não retorna | Falta |

### Problema 2: Customer ID com Formato Incorreto

O `google_customer_id` está salvo como `985-884-3262` (com hífens), mas a API do Google Ads espera o ID sem hífens: `9858843262`.

### Problema 3: `date_preset` Ignorado

A Edge Function recebe `date_preset: "last_7d"` do frontend, mas o código só processa `date_range.start` e `date_range.end`. O parâmetro `date_preset` é ignorado.

---

## Solução Proposta

### Tarefa 1: Corrigir Formato do Customer ID

Remover os hífens do `google_customer_id` antes de fazer a requisição à API.

**Arquivo:** `supabase/functions/google-ads-insights/index.ts`

```typescript
// Antes
const customerId = client.google_customer_id;

// Depois
const customerId = client.google_customer_id.replace(/-/g, '');
```

### Tarefa 2: Adicionar Suporte a `date_preset`

Implementar conversão de `date_preset` para datas de início/fim.

**Arquivo:** `supabase/functions/google-ads-insights/index.ts`

```typescript
function getDateRangeFromPreset(preset: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0].replace(/-/g, '');
  
  switch (preset) {
    case 'today':
      return { start: end, end };
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yDate = yesterday.toISOString().split('T')[0].replace(/-/g, '');
      return { start: yDate, end: yDate };
    case 'last_7d':
      const start7 = new Date(now);
      start7.setDate(start7.getDate() - 7);
      return { start: start7.toISOString().split('T')[0].replace(/-/g, ''), end };
    // ... outros casos
  }
}
```

### Tarefa 3: Padronizar Nomes das Métricas

Atualizar a Edge Function para retornar métricas com as mesmas chaves que o ReportEditor espera.

**Arquivo:** `supabase/functions/google-ads-insights/index.ts`

| Chave Atual | Nova Chave | Descrição |
|-------------|------------|-----------|
| `spend` | `cost` | Para alinhar com ReportEditor |
| `cpc` | `average_cpc` | CPC Médio |
| (novo) | `average_cpm` | CPM Médio calculado |

**Ou alternativamente**, atualizar o ReportEditor para usar as mesmas chaves que a API retorna:

| Chave Atual (ReportEditor) | Nova Chave | 
|----------------------------|------------|
| `cost` | `spend` |
| `average_cpc` | `cpc` |
| `average_cpm` | `cpm` |

**Recomendação**: Atualizar a Edge Function para manter compatibilidade com a convenção do Google Ads (cost, average_cpc, etc.) e manter consistência.

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/google-ads-insights/index.ts` | Modificar | Corrigir formato do customer_id, adicionar suporte a date_preset, padronizar métricas |
| `src/pages/dashboard/ReportEditor.tsx` | Modificar | Atualizar chaves das métricas Google para corresponder à API |
| `src/pages/dashboard/Dashboard.tsx` | Verificar | Garantir que o mapeamento de ícones inclui as chaves corretas |
| `src/pages/dashboard/ReportViewer.tsx` | Verificar | Mesmo mapeamento de chaves |

---

## Detalhamento da Correção na Edge Function

```typescript
// 1. Remover hífens do customer ID
const customerId = client.google_customer_id.replace(/-/g, '');

// 2. Processar date_preset
const { client_id, date_preset, date_range } = await req.json();

function getDateRange(preset?: string, range?: { start: string; end: string }) {
  if (range?.start && range?.end) {
    return range;
  }
  
  const now = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  switch (preset) {
    case 'today':
      return { start: formatDate(now), end: formatDate(now) };
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: formatDate(yesterday), end: formatDate(yesterday) };
    case 'last_7d':
    default:
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { start: formatDate(start), end: formatDate(now) };
    case 'last_14d':
      const start14 = new Date(now);
      start14.setDate(start14.getDate() - 14);
      return { start: formatDate(start14), end: formatDate(now) };
    case 'last_30d':
      const start30 = new Date(now);
      start30.setDate(start30.getDate() - 30);
      return { start: formatDate(start30), end: formatDate(now) };
    case 'this_month':
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: formatDate(thisMonth), end: formatDate(now) };
    case 'last_month':
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: formatDate(lastMonthStart), end: formatDate(lastMonthEnd) };
  }
}

// 3. Padronizar métricas de saída
const metrics = {
  cost: totalSpend,  // Renomeado de 'spend' para 'cost'
  impressions: totalImpressions,
  clicks: totalClicks,
  ctr,
  average_cpc: cpc,  // Renomeado de 'cpc' para 'average_cpc'
  average_cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,  // Novo
  conversions: totalConversions,
  conversion_value: totalConversionValue,
  cost_per_conversion: cpl,
};
```

---

## Ordem de Execução

1. **Atualizar Edge Function** - Corrigir formato do customer_id, adicionar date_preset, padronizar métricas
2. **Atualizar ReportEditor** - Garantir que as chaves correspondem
3. **Testar** - Verificar se os dados aparecem no dashboard
4. **Deploy** - Reimplantar a Edge Function

---

## Resultado Esperado

Após as correções:
- Os dados do Google Ads aparecerão no dashboard
- As métricas terão valores reais (se houver dados na conta)
- O seletor de período funcionará corretamente

