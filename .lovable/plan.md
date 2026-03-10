

## Plano: Página de Otimizações

### Resumo
Criar uma nova seção "Otimizações" no dashboard com duas telas:
1. **Listagem** — tabela com todos os registros de otimização do cliente
2. **Formulário** — tela para criar/editar uma otimização

Cada registro é vinculado a um `client_id`, garantindo isolamento por conta.

---

### 1. Banco de Dados — Nova tabela `optimizations`

```sql
CREATE TABLE public.optimizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  objective text NOT NULL,          -- Objetivo do plano
  hypothesis text NOT NULL,         -- Hipótese
  applied_test text NOT NULL,       -- Teste aplicado
  notes text,                       -- Nota
  final_result text,                -- Resultado final
  status text NOT NULL DEFAULT 'em_progresso',  -- em_progresso | concluido
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  next_analysis_date date,          -- Data da próxima análise
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.optimizations ENABLE ROW LEVEL SECURITY;
```

**RLS Policies:**
- Admin: ALL (usando `has_role`)
- Cliente: SELECT/INSERT/UPDATE/DELETE onde `client_id = current_user_client_id()`

**Trigger:** `update_updated_at_column` para atualizar `updated_at` automaticamente.

---

### 2. Frontend — Arquivos novos

| Arquivo | Descrição |
|---|---|
| `src/pages/dashboard/Optimizations.tsx` | Tabela listando otimizações com colunas: Objetivo, Hipótese, Teste, Nota, Resultado, Status (badge colorido), Data Início, Próxima Análise. Botão "Nova Otimização" no topo. |
| `src/pages/dashboard/OptimizationForm.tsx` | Formulário com campos de texto/textarea e date pickers para criar ou editar um registro. Rota com parâmetro opcional `:id` para edição. |

---

### 3. Roteamento (`App.tsx`)

Adicionar duas rotas protegidas:
- `/dashboard/optimizations` → listagem
- `/dashboard/optimizations/new` → formulário (criar)
- `/dashboard/optimizations/:id/edit` → formulário (editar)

---

### 4. Navegação (`DashboardLayout.tsx`)

Adicionar item "Otimizações" no `bottomNavItems` com ícone `Lightbulb` (lucide), link `/dashboard/optimizations`.

---

### 5. Comportamento

- A listagem filtra por `client_id` do contexto atual (via RLS + `current_user_client_id()`)
- Status exibido como badge: "Em progresso" (amarelo) / "Concluído" (verde)
- Botão de editar em cada linha leva ao formulário preenchido
- Após salvar, redireciona para a listagem com toast de sucesso

