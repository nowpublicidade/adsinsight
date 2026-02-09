

# Plano: Redesign Completo do Dashboard - Layout Multi-Plataforma

## Resumo

Recriar o dashboard seguindo o layout de referencia do Looker Studio, com navegacao lateral por plataforma (Home, Meta Ads, Google Ads, Analytics), sub-abas por plataforma (Visao Geral, Anuncios, Demografico/Historico), KPI cards com barras de comparacao, tabelas de performance, graficos temporais, funil de metricas e integracao com Google Analytics.

---

## Estrutura de Paginas

```text
Sidebar (icones)          Top Bar (tabs)              Conteudo
+--------+   +------------------------------------------+
| Home   |   | Meta Ads | Google Ads | Analytics        |  <- pagina Home (3 colunas)
| Meta   |   | Visao Geral | Anuncios | Demografico    |  <- pagina Meta Ads
| Google |   | Visao Geral | Anuncios | Historico       |  <- pagina Google Ads
| Analyt.|   | Visao Geral | Origens | Historico | Tec. |  <- pagina Analytics
+--------+   +------------------------------------------+
```

---

## Fase 1: Reestruturar Layout e Navegacao (~8-10 creditos)

### 1.1 Novo DashboardLayout com sidebar de icones

- Substituir sidebar textual atual por sidebar compacta (apenas icones: Home, Meta, Google Ads, Analytics)
- Manter logo no topo
- Icones com tooltip ao hover
- Cor de destaque quando ativo (roxo/azul conforme referencia)

### 1.2 Novas rotas

- `/dashboard` - Home (visao geral 3 colunas)
- `/dashboard/meta` - Meta Ads (com sub-tabs)
- `/dashboard/google` - Google Ads (com sub-tabs)
- `/dashboard/analytics` - Google Analytics (com sub-tabs)
- Manter rotas existentes de reports, connections, settings

### 1.3 Top bar com tabs de plataforma

- Na Home: exibir tabs "Meta Ads + Google Ads + Analytics" como indicador
- Nas paginas de plataforma: sub-tabs (Visao Geral, Anuncios, Demografico, etc.)
- Seletor de periodo no canto direito

---

## Fase 2: Pagina Home - Dashboard Geral (~5-6 creditos)

Layout em 3 colunas como na referencia:

### Linha 1: KPI Cards resumidos
- Coluna Meta: Investimento Total, Impressoes Totais
- Coluna Google: CPC, CPM
- Coluna Analytics: Sessoes, Novos Usuarios, Eventos Principais (com barras de progresso)

### Linha 2: Cards de plataforma
- Coluna Meta: Card "Meta Ads" com Investimento, Leads, CPL, CPM
- Coluna Google: Card "Google Ads" com Custo, Conversoes, Custo/conv, CPC medio (com barras de comparacao e variacao %)
- Coluna Analytics: Mini grafico de Sessoes ao longo do tempo

### Linha 3: Graficos temporais
- Coluna Meta: Grafico de barras "Visao atemporal" (Leads por dia)
- Coluna Google: Grafico de barras "Visao atemporal" (Conversoes por dia)
- Coluna Analytics: Grafico pizza "Origem por Acesso" + tabela de cidades

**Widgets personalizaveis**: O usuario podera escolher quais metricas aparecem em cada slot via ReportEditor.

---

## Fase 3: Pagina Meta Ads (~8-10 creditos)

### 3.1 Sub-tab "Visao Geral"
- Linha de KPI cards no topo: Amount Spent, Total de Leads, Custo por Lead, Impressoes, CPC, CPM
  - Cada card com variacao % e barra de comparacao (verde = positivo, vermelho = negativo)
- Tabela "Performance por campanha" (Campaign Name, Investimento, Leads, CPL)
  - Paginacao
- Funil visual estilo cascata (Reach -> Impressions -> Link Clicks -> Leads) em gradiente roxo
- Grafico de linha "Visao atemporal" (Impressions + Leads ao longo do tempo, dual axis)

### 3.2 Sub-tab "Anuncios"
- KPI cards no topo (CTR, Total de Leads, CPL, Impressoes, CPC, CPM)
- Tabela "Performance por Criativos" com colunas: Campaign Name, **Ad Preview (imagem)**, Leads, Cost per Lead, CTR
  - **Previews de anuncios**: Buscar creative thumbnails via Meta Marketing API (`/adcreatives?fields=thumbnail_url,image_url`)
  - Paginacao

### 3.3 Sub-tab "Demografico"
- 4 graficos pizza em grid 2x2:
  - Performance por Canal (Instagram, Audience Network, etc.)
  - Performance por Posicionamento (Feed, Stories, etc.)
  - Performance por Idade (faixas etarias)
  - Performance por Genero

### Backend (Edge Function updates)
- Atualizar `meta-ads-insights` para retornar dados por campanha, por anuncio (com preview), por dia, e breakdowns demograficos
- Novos endpoints ou parametros: `breakdown=campaign`, `breakdown=ad`, `breakdown=age,gender`, `breakdown=publisher_platform`

---

## Fase 4: Pagina Google Ads (~8-10 creditos)

### 4.1 Sub-tab "Visao Geral"
- KPI cards principais: Custo, Conversoes, Taxa conv., CPC medio, CTR (com variacao e barras)
- KPI cards secundarios menores: Custo medio, Cliques, Cliques invalidos, Taxa engajamento, etc.
- Filtros laterais: Status campanha, Tipo canal, Regiao, Cidade
- Tabela "Visao Geral" (Campanha, Custo)
- Tabela "Criativos" (Keyword Text, Custo, Impressoes)
- Funil de metricas (Impressoes -> CPC -> CTR -> Custo -> Cliques)
- Grafico pizza "Dimensoes %"
- Grafico temporal "Visao temporal" (Custo ao longo do tempo)

### 4.2 Sub-tab "Anuncios"
- KPI cards expandidos (Custo, Conversoes, Impressoes, Taxa conv., CPC, CTR, Cliques, Custo medio, etc.)
- Tabela Campanhas (Campanha, Custo, Conversoes)
- Tabela Conjuntos de Anuncios (Dia da semana, Custo, Conversoes)
- Tabela Criativos/Keywords (Keyword Text, Custo, Cliques, Conversoes, Taxa conv., CPC, CPM)
  - Sem preview de imagem, apenas texto (titulo/descricao)

### 4.3 Sub-tab "Historico"
- KPI cards com dados do periodo completo
- Tabela Historico detalhado por mes (Mes, Custo, Conversoes)
- Tabelas: Campanhas, Conjuntos de anuncios, Criativos
- Grafico temporal longo prazo

### Backend (Edge Function updates)
- Atualizar `google-ads-insights` para suportar queries por campanha, por keyword/ad group, por dia da semana, e historico mensal
- Novos parametros: `breakdown=campaign`, `breakdown=ad_group`, `breakdown=keyword`, `breakdown=monthly`

---

## Fase 5: Integracao Google Analytics (~10-12 creditos)

### 5.1 Nova integracao OAuth
- Criar Edge Functions: `google-analytics-oauth-start`, `google-analytics-oauth-callback`
- Adicionar campos na tabela `clients`: `ga_property_id`, `ga_access_token`, `ga_refresh_token`, `ga_connected_at`, `ga_token_expires_at`
- Usar GA4 Data API (Google Analytics Data API v1)
- Adicionar card de conexao na pagina de Conexoes

### 5.2 Edge Function `google-analytics-insights`
- Buscar metricas: Sessoes, Novos Usuarios, Eventos, Taxa Engajamento, Receita, Duracao Sessao, Sessoes por Usuario, Eventos por Sessao, Sessoes Engajadas
- Breakdowns: por pagina, por cidade, por origem/midia, por dispositivo, por genero
- Dados temporais por dia

### 5.3 Pagina Analytics
- Sub-tab "Visao Geral": KPI cards, tabela de paginas, tabela de cidades, funil (Sessoes -> Views -> Cart -> Checkout -> Compras), grafico pizza dimensoes, grafico temporal
- Sub-tab "Origens de Acesso": Tabela por origem/midia
- Sub-tab "Historico": Dados mensais
- Sub-tab "Visao Tecnica": Dispositivos, navegadores

---

## Fase 6: Sistema de Widgets Personalizaveis (~4-5 creditos)

### 6.1 Template de layout
- Cada pagina (Home, Meta, Google, Analytics) tera slots de widgets pre-definidos pelo template
- O usuario "encaixa" metricas nos slots via ReportEditor atualizado
- Tipos de widget: `kpi_card`, `table`, `chart_line`, `chart_bar`, `chart_pie`, `funnel`

### 6.2 Atualizar ReportEditor
- Adicionar opcao de plataforma "analytics"
- Adicionar tipo de visualizacao (card, tabela, grafico, funil)
- Permitir configurar quais metricas aparecem em cada secao

### 6.3 Atualizar tabela report_widgets
- Adicionar campo `section` (ex: "kpi_top", "table_campaigns", "chart_temporal", "funnel")
- Adicionar suporte a plataforma "analytics"

---

## Componentes Reutilizaveis a Criar

| Componente | Descricao |
|---|---|
| `KpiCard` | Card de metrica com valor, variacao %, barra de comparacao |
| `ComparisonBar` | Barra verde/vermelha de comparacao com periodo anterior |
| `DataTable` | Tabela paginada generica com ordenacao |
| `TimeSeriesChart` | Grafico de linha/barra temporal (recharts) |
| `PieChartWidget` | Grafico pizza com legenda |
| `FunnelChart` | Funil visual estilo cascata (gradiente roxo/verde) |
| `PlatformSidebar` | Sidebar compacta com icones de plataforma |
| `PlatformHeader` | Header com logo da plataforma + sub-tabs |
| `AdPreviewCard` | Card de preview de anuncio (Meta: imagem, Google: texto) |

---

## Estimativa de Creditos

| Fase | Descricao | Creditos Estimados |
|---|---|---|
| Fase 1 | Layout e Navegacao | 8-10 |
| Fase 2 | Home Dashboard | 5-6 |
| Fase 3 | Meta Ads (3 sub-tabs + backend) | 8-10 |
| Fase 4 | Google Ads (3 sub-tabs + backend) | 8-10 |
| Fase 5 | Google Analytics (integracao completa) | 10-12 |
| Fase 6 | Widgets Personalizaveis | 4-5 |
| **Total** | | **43-53 creditos** |

**Nota**: Cada "credito" equivale a aproximadamente 1 mensagem de implementacao no Lovable. A estimativa pode variar dependendo de ajustes e debugging necessarios.

---

## Ordem de Implementacao Recomendada

1. **Fase 1** - Layout/Navegacao (base para tudo)
2. **Fase 2** - Home (impacto visual imediato)
3. **Fase 3** - Meta Ads (ja tem integracao pronta)
4. **Fase 4** - Google Ads (ja tem integracao pronta)
5. **Fase 5** - Google Analytics (nova integracao)
6. **Fase 6** - Personalizacao de widgets (refinamento)

---

## Detalhes Tecnicos

### Edge Functions a criar/modificar:
- `meta-ads-insights` - adicionar breakdowns (campanha, anuncio com preview, demografico, temporal)
- `google-ads-insights` - adicionar breakdowns (campanha, keyword, ad group, temporal, mensal)
- `google-analytics-oauth-start` - novo
- `google-analytics-oauth-callback` - novo
- `google-analytics-insights` - novo

### Migracoes de banco necessarias:
- Adicionar campos GA na tabela `clients` (ga_property_id, ga_access_token, etc.)
- Adicionar campo `section` na tabela `report_widgets`
- Adicionar valor "analytics" como plataforma valida em `report_widgets`

### Bibliotecas existentes que serao usadas:
- `recharts` - graficos (ja instalado)
- `@radix-ui/react-tabs` - sub-tabs (ja instalado)
- Nenhuma dependencia nova necessaria

