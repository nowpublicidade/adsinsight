

## Plano: Avisos Multi-Canal (Google Ads via Edge Function existente)

### Resumo

Adicionar suporte a Google Ads na pagina de Avisos. O usuario escolhe o canal (Meta Ads ou Google Ads) ao criar um alerta. Para Google Ads, a edge function `send-alert-report` chamara internamente a edge function `google-ads-insights` ja existente, reutilizando os mesmos dados do painel.

---

### 1. Banco de Dados — Adicionar coluna `channel`

Adicionar coluna `channel` na tabela `alert_configs`:
```sql
ALTER TABLE alert_configs ADD COLUMN channel text NOT NULL DEFAULT 'meta';
```
- Valores: `meta` ou `google_ads`
- O campo `meta_token` passa a ser opcional (so necessario para canal Meta)

---

### 2. Edge Function — `send-alert-report`

Adicionar branch por canal:

- **Se `channel = 'meta'`**: fluxo atual (chama API do Meta diretamente)
- **Se `channel = 'google_ads'`**: chama internamente a edge function `google-ads-insights` via `fetch()` com os parametros:
  ```json
  { "client_id": "<client_id>", "date_preset": "<mapeado do report_period>" }
  ```
  A funcao ja retorna as metricas agregadas (cost, impressions, clicks, conversions, etc.), entao basta mapear para as variaveis do template.

Metricas disponiveis para Google Ads:
`{{cost}}`, `{{impressions}}`, `{{clicks}}`, `{{conversions}}`, `{{conversion_value}}`, `{{ctr}}`, `{{average_cpc}}`, `{{average_cpm}}`, `{{cost_per_conversion}}`, `{{conversion_rate}}`

Mapeamento de periodos (`report_period` → `date_preset` do google-ads-insights):
- `ontem` → `yesterday`
- `hoje` → `today`
- `3dias` → `last_7d` (mais proximo)
- `7dias` → `last_7d`
- `14dias` → `last_14d`
- `30dias` → `last_30d`
- `90dias` → `last_90d`
- `1ano` → `last_365d`
- outros → `date_range` customizado

---

### 3. Frontend — `Alerts.tsx`

**Mudancas no formulario:**
1. Novo campo **"Canal"** (select): Meta Ads / Google Ads — exibido no topo
2. Campo **"Token do Meta"** visivel apenas quando canal = Meta
3. Lista de **metricas** muda conforme o canal selecionado:
   - Meta: metricas atuais (spend, leads, ctr, etc.)
   - Google Ads: cost, impressions, clicks, conversions, conversion_value, ctr, average_cpc, average_cpm, cost_per_conversion, conversion_rate
4. **Variaveis do template** atualizam conforme o canal
5. Na tabela de alertas, exibir badge com o canal (Meta / Google)

---

### 4. Arquivos Modificados

| Arquivo | Acao |
|---|---|
| Migracao SQL | Adicionar coluna `channel` em `alert_configs` |
| `supabase/functions/send-alert-report/index.ts` | Adicionar logica Google Ads via chamada interna |
| `src/pages/dashboard/Alerts.tsx` | Seletor de canal + metricas condicionais |

