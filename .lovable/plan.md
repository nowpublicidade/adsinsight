

# Plano de Correções: Navegação, Conexões e Integração de Relatórios

## Problemas Identificados

### 1. Links "Conexões" e "Configurações" não clicáveis
Após análise do código, os links estão corretos no `DashboardLayout.tsx` e as rotas estão registradas no `App.tsx`. O problema é que o usuário **está na rota `/dashboard`** e os links funcionam, mas pode haver:
- Um elemento sobrepondo os links (z-index)
- A área clicável pode estar sendo afetada pelo CSS do sidebar

### 2. Botão "Conectar Meta Ads" - Por que não funciona?
O botão está **desabilitado propositalmente** quando:
- Não há cliente selecionado
- O campo "ID da Conta de Anúncios" está vazio

Isso é o comportamento correto, mas precisa de melhor feedback visual para o usuário entender que deve inserir o ID primeiro.

### 3. Relatórios Personalizados e Dashboard
Atualmente o sistema funciona assim:

```text
Relatórios (criar) --> ReportEditor (configurar métricas) --> ???
```

O problema é que **não existe** uma tela para **visualizar** os relatórios configurados com dados reais. Os relatórios são configurados mas nunca são exibidos.

O Dashboard atual mostra métricas fixas/mockadas, **sem nenhuma integração** com os relatórios personalizados.

---

## Solução Proposta

### Tarefa 1: Corrigir Navegação do Sidebar
Verificar e corrigir possíveis problemas de z-index ou sobreposição de elementos no sidebar.

**Arquivos:**
- `src/components/layout/DashboardLayout.tsx`

### Tarefa 2: Melhorar Feedback do Botão Conectar
Adicionar mensagens claras e estados visuais para o botão conectar:
- Mostrar tooltip explicando por que está desabilitado
- Destacar visualmente que o ID precisa ser preenchido primeiro
- Adicionar validação inline

**Arquivos:**
- `src/pages/dashboard/Connections.tsx`

### Tarefa 3: Criar Visualização de Relatório
Criar uma página para visualizar os relatórios com as métricas configuradas.

**Nova página:** `/dashboard/reports/:reportId/view`
- Buscar widgets configurados do relatório
- Buscar dados reais das Edge Functions (`meta-ads-insights`, `google-ads-insights`)
- Renderizar as métricas configuradas em formato de cards/gráficos

**Arquivos:**
- `src/pages/dashboard/ReportViewer.tsx` (novo)
- `src/App.tsx` (adicionar rota)
- `src/pages/dashboard/Reports.tsx` (adicionar botão "Visualizar")

### Tarefa 4: Integrar Relatórios ao Dashboard
Modificar o Dashboard para mostrar relatórios do cliente ou permitir seleção de um relatório padrão.

**Opções:**
1. O Dashboard exibe o primeiro relatório configurado
2. O Dashboard lista todos os relatórios como cards clicáveis
3. O usuário pode definir um "relatório padrão" nas configurações

**Arquivos:**
- `src/pages/dashboard/Dashboard.tsx`

---

## Detalhamento Técnico

### Visualização de Relatório

```text
ReportViewer.tsx
    |
    +--> Busca report (supabase.from('reports'))
    +--> Busca report_widgets (supabase.from('report_widgets'))
    |
    +--> Para cada widget:
         |
         +--> Se platform = 'meta':
         |      Busca dados de meta-ads-insights Edge Function
         |
         +--> Se platform = 'google':
                Busca dados de google-ads-insights Edge Function
    |
    +--> Renderiza widgets como MetricCard
```

### Fluxo Completo do Sistema

```text
Relatórios --> Criar Relatório --> ReportEditor (configurar métricas)
                                          |
                                          v
                                  report_widgets (salvo no banco)
                                          |
                                          v
Dashboard / ReportViewer --> Buscar widgets --> Buscar dados APIs --> Exibir métricas
```

### ID da Conta de Anúncios
Os IDs são salvos na tabela `clients`:
- `meta_ad_account_id`: Para buscar dados da API Meta
- `google_customer_id`: Para buscar dados da API Google

As Edge Functions usam estes IDs para fazer as requisições às APIs.

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/layout/DashboardLayout.tsx` | Modificar | Corrigir z-index do sidebar |
| `src/pages/dashboard/Connections.tsx` | Modificar | Melhorar feedback visual |
| `src/pages/dashboard/ReportViewer.tsx` | **Criar** | Página para visualizar relatório |
| `src/pages/dashboard/Reports.tsx` | Modificar | Adicionar botão "Visualizar" |
| `src/pages/dashboard/Dashboard.tsx` | Modificar | Integrar com relatórios |
| `src/App.tsx` | Modificar | Adicionar rota de visualização |

---

## Prioridades

1. **Alta**: Corrigir navegação do sidebar (links não clicáveis)
2. **Alta**: Criar visualização de relatório com métricas reais
3. **Média**: Integrar relatórios ao Dashboard principal
4. **Média**: Melhorar UX do botão Conectar

