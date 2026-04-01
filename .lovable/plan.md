

## Plano: Pagina de Acompanhamento de Campanhas

### Resumo

Nova pagina `/dashboard/tracking` com tabela de campanhas inseridas manualmente, mostrando a variacao da metrica principal entre inputs consecutivos. O usuario configura qual metrica acompanhar (ex: ROAS, CPL, CPA) e o periodo fixo de analise.

---

### 1. Banco de Dados — 2 novas tabelas

**`tracking_configs`** — configuracao por cliente
```sql
id uuid PK,
client_id uuid NOT NULL,
metric_name text NOT NULL DEFAULT 'ROAS',  -- nome da metrica principal
analysis_period text NOT NULL DEFAULT 'semanal',  -- diario, semanal, quinzenal, mensal
created_at timestamptz,
updated_at timestamptz
```

**`tracking_entries`** — cada linha da tabela
```sql
id uuid PK,
client_id uuid NOT NULL,
campaign_name text NOT NULL,
metric_value numeric NOT NULL,
daily_budget numeric NOT NULL,
recorded_at date NOT NULL DEFAULT CURRENT_DATE,
created_at timestamptz
```

RLS: admin full access + cliente acessa seus proprios dados via `user_client_access`.

---

### 2. Frontend — `src/pages/dashboard/Tracking.tsx`

**Secao de Configuracao (topo)**:
- Seletor da metrica principal (ROAS, CPL, CPA, CTR, ou custom)
- Seletor do periodo de analise (diario, semanal, quinzenal, mensal)
- Legendas explicativas ao lado de cada configuracao

**Tabela principal**:
- Colunas: Campanha | Metrica Principal (valor atual) | Variacao (%) | Orcamento Diario
- Variacao calculada comparando o input atual com o input anterior da mesma campanha
- Indicador visual: verde (positivo), vermelho (negativo), cinza (sem historico)
- Celulas com fundo colorido similar a imagem (vermelho para valores baixos)

**Acoes**:
- Botao "Adicionar Campanha" — formulario inline ou dialog
- Edicao inline do valor da metrica e orcamento
- Botao "Atualizar Metricas" — registra novos valores mantendo historico

**Legendas**:
- Tooltip/card explicando: o que e a metrica principal, como a variacao e calculada, o que significa o periodo de analise

---

### 3. Navegacao

- Adicionar item "Acompanhamento" no sidebar (icone `ClipboardList` ou `BarChart3`)
- Posicionar antes de "Otimizacoes" no `bottomNavItems`
- Rota: `/dashboard/tracking`
- Sempre visivel (nao depende de conexao)

---

### 4. Arquivos Modificados/Criados

| Arquivo | Acao |
|---|---|
| Migracao SQL | Criar tabelas `tracking_configs` e `tracking_entries` com RLS |
| `src/pages/dashboard/Tracking.tsx` | Nova pagina completa |
| `src/App.tsx` | Adicionar rota `/dashboard/tracking` |
| `src/components/layout/DashboardLayout.tsx` | Adicionar item no sidebar |

---

### 5. Logica de Variacao

Para cada campanha, buscar os 2 registros mais recentes de `tracking_entries`. A variacao e:
```
variacao = ((valor_atual - valor_anterior) / valor_anterior) * 100
```
Se so houver 1 registro, exibir "—" sem indicador.

