

# Plano de Implementação: Páginas e Conexões OAuth

## Problemas Identificados

### 1. Páginas Relatórios e Configurações (404 Error)
As rotas `/dashboard/reports` e `/dashboard/settings` estão referenciadas no menu lateral (`DashboardLayout.tsx`), mas:
- As páginas **não existem** no diretório `src/pages/dashboard/`
- As rotas **não estão configuradas** no `App.tsx`

### 2. Botão "Conectar" Não Funciona
A conexão OAuth depende do `clientId` vindo do `AuthContext`. Se o usuário não está vinculado a um cliente:
- `clientId` será `null`
- A função `handleConnectMeta/Google` envia `client_id: null` para a Edge Function
- A Edge Function retorna erro 400 (client_id is required)
- O erro não é exibido ao usuário de forma clara

### 3. Fluxo de Configuração de Dados
Os dados de anúncios serão extraídos através das conexões OAuth que salvam os tokens na tabela `clients`:
- Meta: `meta_access_token`, `meta_ad_account_id`, etc.
- Google: `google_access_token`, `google_refresh_token`, `google_customer_id`, etc.

As Edge Functions `meta-ads-insights` e `google-ads-insights` usam esses tokens para buscar métricas.

---

## Solução Proposta

### Tarefa 1: Criar Página de Relatórios (`/dashboard/reports`)

Funcionalidades:
- Listar relatórios do cliente (tabela `reports`)
- Criar/editar relatórios personalizados
- Visualizar métricas com widgets configuráveis
- Exportar relatórios (PDF/CSV futuro)

**Estrutura da página:**
- Lista de relatórios existentes
- Botão "Novo Relatório"
- Visualização detalhada de cada relatório com métricas do Meta/Google Ads

### Tarefa 2: Criar Página de Configurações (`/dashboard/settings`)

Funcionalidades:
- Dados do perfil do usuário
- Preferências de notificação
- Configurações de visualização (tema, formato de data, moeda)
- Para admins: configurações adicionais do cliente

### Tarefa 3: Corrigir Conexões OAuth

**Problema identificado:** O botão conectar não funciona porque:
1. O usuário admin pode não ter `clientId` vinculado
2. Não há feedback visual quando ocorre erro

**Correções:**
- Mostrar mensagem clara se não há cliente vinculado
- Exibir toast de erro quando a Edge Function falhar
- Para admins: permitir selecionar qual cliente conectar
- Verificar resposta da Edge Function antes de redirecionar

### Tarefa 4: Adicionar Rotas ao App.tsx

Registrar as novas páginas:
```text
/dashboard/reports   -> Reports.tsx
/dashboard/settings  -> Settings.tsx
```

---

## Detalhamento Técnico

### Arquivos a Criar:
1. `src/pages/dashboard/Reports.tsx` - Página de relatórios
2. `src/pages/dashboard/Settings.tsx` - Página de configurações

### Arquivos a Modificar:
1. `src/App.tsx` - Adicionar rotas
2. `src/pages/dashboard/Connections.tsx` - Corrigir tratamento de erros e feedback

### Fluxo de Dados de Anúncios:

```text
+------------------+     +-----------------+     +------------------+
|   Conexões       | --> |  clients table  | --> |  Edge Functions  |
| (OAuth tokens)   |     | (tokens saved)  |     | (fetch metrics)  |
+------------------+     +-----------------+     +------------------+
                                                         |
                                                         v
+------------------+     +-----------------+     +------------------+
|   Dashboard      | <-- |   API Response  | <-- | Meta/Google API  |
| (display data)   |     |   (metrics)     |     | (ads insights)   |
+------------------+     +-----------------+     +------------------+
```

### Correção do Botão Conectar:

A lógica atual:
```typescript
const handleConnectMeta = async () => {
  setConnectingMeta(true);
  try {
    const { data, error } = await supabase.functions.invoke('meta-oauth-start', {
      body: { client_id: clientId },  // clientId pode ser null!
    });
    if (error) throw error;
    if (data?.authUrl) {
      window.location.href = data.authUrl;
    }
  } catch (error) {
    toast.error('Erro ao iniciar conexão: ' + error.message);
    setConnectingMeta(false);
  }
};
```

**Problema:** Se `clientId` for `null`, a Edge Function retorna erro, mas `supabase.functions.invoke` pode não capturar isso corretamente.

**Solução:**
1. Verificar se `clientId` existe antes de chamar a função
2. Verificar o conteúdo da resposta `data` para erros
3. Mostrar mensagem apropriada se não há cliente vinculado

---

## Resumo das Alterações

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/dashboard/Reports.tsx` | Criar | Página de relatórios |
| `src/pages/dashboard/Settings.tsx` | Criar | Página de configurações |
| `src/App.tsx` | Editar | Adicionar rotas reports e settings |
| `src/pages/dashboard/Connections.tsx` | Editar | Melhorar tratamento de erros e feedback |

