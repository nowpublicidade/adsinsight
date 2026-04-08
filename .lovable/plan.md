

## Plano: Pagina de Avisos — Relatorios Automaticos via WhatsApp

### Resumo

Nova pagina `/dashboard/alerts` para configurar envio automatico de relatorios de Meta Ads via WhatsApp. O usuario configura a instancia WhatsApp, seleciona metricas, define programacao (dia/horario) e monta a mensagem com variaveis. Um cron job dispara a edge function que busca dados no Meta, armazena no banco e envia via API do WhatsApp.

---

### 1. Banco de Dados — 2 novas tabelas

**`alert_configs`** — configuracao de cada alerta por cliente
```
id uuid PK
client_id uuid NOT NULL
whatsapp_instance_name text NOT NULL        -- nome da instancia
whatsapp_api_url text NOT NULL              -- URL base da API (ex: https://evo.agencianowpublicidade.online)
whatsapp_api_key text NOT NULL              -- apikey do header
meta_token text NOT NULL                    -- token do Meta
recipient_number text NOT NULL              -- numero do cliente
schedule_day text NOT NULL                  -- dia da semana (monday, tuesday, etc.)
schedule_time time NOT NULL                 -- horario (HH:MM)
report_period text NOT NULL DEFAULT '7dias' -- periodo do relatorio
selected_metrics jsonb NOT NULL DEFAULT '[]' -- metricas selecionadas (spend, impressions, clicks, etc.)
message_template text NOT NULL              -- mensagem com variaveis {{spend}}, {{impressions}}, etc.
is_active boolean DEFAULT true
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()
```

**`alert_logs`** — historico de envios
```
id uuid PK
alert_config_id uuid FK -> alert_configs(id)
client_id uuid NOT NULL
sent_at timestamptz DEFAULT now()
status text NOT NULL -- success, error
meta_data jsonb      -- dados brutos retornados do Meta
message_sent text    -- mensagem final enviada
error_message text
```

RLS: admin full access + cliente acessa seus proprios dados via `user_client_access`.

---

### 2. Edge Function — `send-alert-report`

Fluxo:
1. Recebe `alert_config_id` (ou e chamada pelo cron para todos ativos)
2. Calcula `since` e `until` baseado em `report_period`
3. Chama a API do Meta:
   ```
   GET https://graph.facebook.com/v21.0/act_{ad_account_id}/insights
   ?time_increment=1&level=ad&limit=3000
   &time_range={"since":"YYYY-MM-DD","until":"YYYY-MM-DD"}
   &fields=campaign_name,spend,impressions,clicks,cpc,cpm,ctr,reach,actions,cost_per_action_type,...
   ```
4. Agrega os dados das metricas selecionadas
5. Salva dados brutos em `alert_logs.meta_data`
6. Substitui variaveis na `message_template` (ex: `{{spend}}` → `R$ 1.234,56`)
7. Envia via WhatsApp:
   ```
   POST https://evo.agencianowpublicidade.online/message/sendText/{instance_name}
   Headers: { apikey: api_key }
   Body: { number: recipient_number, text: mensagem_final }
   ```
8. Registra resultado em `alert_logs`

---

### 3. Cron Job (pg_cron + pg_net)

- Cron rodando a cada minuto verificando se ha alertas para o dia/horario atual
- Chama a edge function `send-alert-report` para cada alerta ativo correspondente

---

### 4. Frontend — `src/pages/dashboard/Alerts.tsx`

**Secoes da pagina:**

1. **Lista de alertas configurados** — tabela com: instancia, numero, dia/horario, status (ativo/inativo), ultimo envio
2. **Botao "Novo Alerta"** — dialog/formulario com todos os campos:
   - Token do Meta
   - Numero do cliente (com mascara)
   - Nome da instancia
   - API Key da instancia
   - Programacao: dia da semana + horario
   - Metricas: multi-select (spend, impressions, clicks, cpc, cpm, ctr, reach, leads, etc.)
   - Periodo do relatorio (mesmo seletor de periodos existente)
   - Mensagem: textarea com dicas de variaveis disponiveis (ex: `{{spend}}`, `{{clicks}}`)
3. **Historico de envios** — tabela com logs dos ultimos envios (data, status, mensagem)
4. **Botao "Enviar agora"** — para teste manual

**Variaveis disponiveis na mensagem:**
`{{spend}}`, `{{impressions}}`, `{{clicks}}`, `{{cpc}}`, `{{cpm}}`, `{{ctr}}`, `{{reach}}`, `{{leads}}`, `{{cost_per_lead}}`, `{{period}}`, `{{client_name}}`

---

### 5. Navegacao

- Adicionar "Avisos" no sidebar (icone `Bell` ou `MessageSquare`)
- Rota: `/dashboard/alerts`
- Posicionar antes de "Configuracoes" no `bottomNavItems`

---

### 6. Arquivos Criados/Modificados

| Arquivo | Acao |
|---|---|
| Migracao SQL | Criar `alert_configs` e `alert_logs` com RLS |
| `supabase/functions/send-alert-report/index.ts` | Edge function: busca Meta + envia WhatsApp |
| `src/pages/dashboard/Alerts.tsx` | Nova pagina completa |
| `src/App.tsx` | Adicionar rota `/dashboard/alerts` |
| `src/components/layout/DashboardLayout.tsx` | Adicionar item no sidebar |
| SQL (insert tool) | Criar cron job com pg_cron |

---

### 7. Seguranca

- Tokens e API keys armazenados no banco (por cliente), nao como secrets globais
- Edge function valida JWT antes de processar
- RLS impede acesso cruzado entre clientes

