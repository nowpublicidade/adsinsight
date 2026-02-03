

## Sistema de Relatórios Meta Ads + Google Ads

Implementação completa do sistema de relatórios com:

---

### 🗄️ Fase 1: Backend (Supabase)

**Banco de Dados:**
- Tabela `clients` - dados de clientes + tokens OAuth
- Tabela `user_profiles` - perfis vinculados aos clientes  
- Tabela `user_roles` - roles separadas (admin/client) para segurança
- Tabela `reports` - múltiplos relatórios por cliente
- Tabela `report_widgets` - métricas de cada relatório
- Tabela `subscription_plans` - planos de uso (gratuito inicial)
- Funções de segurança `has_role()` e `current_user_client_id()`
- Políticas RLS completas

**Edge Functions:**
1. `meta-oauth-start` - Iniciar fluxo OAuth Meta
2. `meta-oauth-callback` - Processar retorno e salvar tokens
3. `meta-token-refresh` - Renovar tokens automaticamente
4. `meta-ads-insights` - Buscar dados + métricas do Pixel
5. `google-oauth-start` - Iniciar fluxo OAuth Google
6. `google-oauth-callback` - Processar retorno + descobrir Account ID
7. `google-token-refresh` - Renovar tokens
8. `google-ads-insights` - Buscar dados de campanhas

---

### 🎨 Fase 2: Tema & Design

- Configurar **dark mode** como padrão
- Cores: fundo escuro, acentos em cyan/azul
- Cards com bordas sutis e glow effects
- Responsivo para desktop e mobile

---

### 👤 Fase 3: Autenticação

- Página `/auth` com login e cadastro
- Validação de email/senha com Zod
- Redirect automático baseado em role
- Context de autenticação global

---

### 🔐 Fase 4: Painel Admin (`/admin`)

- Lista de clientes com status de conexão
- Modal para criar/editar clientes
- Indicadores visuais: Meta ✓/✗, Google ✓/✗
- Gerenciamento de usuários

---

### 📊 Fase 5: Dashboard do Cliente (`/dashboard`)

**Configurações:**
- Upload de logo
- Editar perfil (nome, email, WhatsApp)
- Botões de conexão OAuth (Meta/Google)

**Relatórios:**
- Criar/duplicar/excluir relatórios
- Seletor de período (7d, 14d, 30d, 90d, custom)
- Toggle comparação de períodos
- Cards de métricas com variação %
- Gráficos interativos (Recharts)

**Personalização:**
- Modal de seleção de métricas
- Drag-and-drop para reordenar
- Escolher visualização (card/gráfico)
- Filtro por plataforma

---

### 📈 Fase 6: Métricas Completas

**Gerais:** Gasto, Leads, CPL, Impressões, Alcance, Cliques, CTR, CPC, CPM, Frequência

**Pixel Meta:** Compras, Valor, ROAS, Custo/Compra, Add to Cart, Checkout, View Content, Registros, Leads Pixel

---

### 🔗 Fase 7: Integrações

- Fluxo OAuth Meta v24.0 completo
- Fluxo OAuth Google Ads v19
- Renovação automática de tokens
- Descoberta automática de Account ID

