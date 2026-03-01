
# Metrica Principal Configuravel - Meta Ads

## Resumo
Permitir que cada cliente defina sua metrica principal do Meta Ads (hoje travada em "Leads"). O dashboard se adapta automaticamente com base na escolha.

---

## 1. Migracao de Banco de Dados
Adicionar coluna `meta_primary_metric` na tabela `clients`:
```sql
ALTER TABLE clients ADD COLUMN meta_primary_metric text DEFAULT 'leads';
```

## 2. Opcoes de Metricas Disponiveis

| Valor interno | Label no seletor | Descricao |
|---|---|---|
| `leads` | Leads (Pixel + Mensagens) | Soma de leads do pixel e mensagens (metrica atual padrao) |
| `pixelLeads` | Form (Pixel) | Leads rastreados via Pixel do Meta (formularios no site) |
| `form_leads` | Formularios (Lead Ads) | Leads gerados via formularios nativos do Meta (Lead Ads) |
| `results` | Resultados (Objetivo) | Total de conversoes do objetivo da campanha |
| `purchases` | Compras | Compras rastreadas pelo pixel |
| `messageLeads` | Mensagens | Conversas iniciadas via anuncio |
| `completeRegistration` | Registros Completos | Registros completados no site |
| `addToCart` | Adicionar ao Carrinho | Eventos de adicionar ao carrinho |
| `initiateCheckout` | Iniciar Checkout | Eventos de inicio de checkout |
| `linkClicks` | Cliques no Link | Cliques no link do anuncio |
| `viewContent` | Visualizacao de Conteudo | Visualizacoes de conteudo no site |

**Notas importantes:**
- **Form (Pixel)**: Usa `pixelLeads`, que ja e extraido pela edge function a partir dos action_types `lead` e `offsite_conversion.fb_pixel_lead`. E o formulario rastreado pelo pixel do Meta no site.
- **Formularios (Lead Ads)**: Nova metrica `formLeads`, extraida de `leadgen_grouped` e `onsite_conversion.lead_grouped` -- formularios nativos do Meta.
- **Resultados**: Nova metrica `results`, extraida do campo `conversions` da API (total de resultados do objetivo da campanha).

## 3. Alteracoes na Edge Function `meta-ads-insights`

Adicionar no `processMetrics`:
- `formLeads`: extrair de `leadgen_grouped`, `onsite_conversion.lead_grouped`
- `results`: somar valores do array `conversions` retornado pela API
- `costPerFormLead`: spend / formLeads
- `costPerResult`: spend / results

## 4. Seletor na Pagina de Configuracoes (Settings.tsx)

Nova secao "Meta Ads" com um dropdown `Select` listando as 11 opcoes. Ao salvar, grava no campo `meta_primary_metric` da tabela `clients`.

## 5. Dashboard Meta Ads (MetaAds.tsx) - Adaptacao Dinamica

Criar um mapa de configuracao por metrica:
```text
metricKey -> { label, costKey, costLabel }
Exemplo: pixelLeads -> { label: "Form", costKey: "costPerPixelLead", costLabel: "Custo por Form" }
```

Substituir todas as referencias hardcoded "Leads"/"CPL":
- KPI Cards: "Total de [Metrica]" e "Custo por [Metrica]"
- Tabela de campanhas: coluna da metrica e custo
- Tabela de anuncios: idem
- Funil de conversao: terceira camada usa a metrica escolhida
- Grafico temporal: linha da metrica escolhida
- Chart title: dinamico

## 6. Dashboard Home (Dashboard.tsx)

Ajustar o card resumo do Meta para exibir a metrica configurada em vez de "Leads" hardcoded nas metricas do `PlatformSummaryCard` e no titulo do grafico temporal.

---

## Arquivos Modificados

| Arquivo | Tipo de Alteracao |
|---|---|
| Migracao SQL | Nova coluna `meta_primary_metric` |
| `supabase/functions/meta-ads-insights/index.ts` | Extrair `formLeads`, `results` e custos |
| `src/pages/dashboard/Settings.tsx` | Seletor de metrica principal |
| `src/pages/dashboard/MetaAds.tsx` | Dashboard dinamico |
| `src/pages/dashboard/Dashboard.tsx` | Card resumo dinamico |
