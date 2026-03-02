

# Adicionar metricas de compras na tabela de anuncios do Meta Ads

## Resumo
Na tabela "Performance por Criativos" da pagina Meta Ads (aba Anuncios), adicionar 4 colunas fixas: **Compras**, **Custo por Compra**, **ROAS** e **Valor de Conversao**. Essas colunas serao exibidas sempre, independente da metrica principal configurada.

## Alteracoes

### Arquivo: `src/pages/dashboard/MetaAds.tsx`

**1. Cabecalho da tabela (linha ~613-621)**
Adicionar 4 novos `TableHead` apos a coluna CTR:
- Compras
- Custo/Compra
- ROAS
- Valor Conversao

**2. Corpo da tabela (linha ~624-646)**
Adicionar 4 novos `TableCell` para cada anuncio:
- `ad.purchases` (formatado como numero)
- `ad.costPerPurchase` (formatado como moeda)
- `ad.roas` (formatado como "X.XXx")
- `ad.purchaseValue` (formatado como moeda)

**3. Colspan do "Nenhum anuncio encontrado" (linha ~650)**
Atualizar o `colSpan` de 6 para 10 para cobrir todas as colunas.

**4. Formatacao de ROAS**
Adicionar tratamento especial no `formatValue` para a chave `roas`, formatando como "X.XXx" (ex: "3.45x").

### Dados
A edge function `meta-ads-insights` ja retorna `purchases`, `costPerPurchase`, `roas` e `purchaseValue` no breakdown por anuncio, pois o `processMetrics` e aplicado a cada linha. Nenhuma alteracao no backend e necessaria.

