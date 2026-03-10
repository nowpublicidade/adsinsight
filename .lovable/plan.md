
## Plano: Conexao de Redes Sociais — IMPLEMENTADO ✅

### O que foi feito

1. **Banco de dados** — Adicionadas 10 colunas à tabela `clients`: `fb_page_id`, `fb_page_token`, `fb_page_connected_at`, `ig_account_id`, `ig_connected_at`, `linkedin_access_token`, `linkedin_refresh_token`, `linkedin_org_id`, `linkedin_connected_at`, `linkedin_token_expires_at`

2. **Edge Functions OAuth** (4 funções):
   - `social-meta-oauth-start` — Inicia OAuth Meta com scopes de Pages + Instagram
   - `social-meta-oauth-callback` — Troca code, busca Page e IG account, salva
   - `linkedin-oauth-start` — Inicia OAuth LinkedIn
   - `linkedin-oauth-callback` — Troca code, busca Organization, salva

3. **Edge Functions Insights** (3 funções):
   - `facebook-page-insights` — Alcance, views, seguidores, curtidas, top posts
   - `instagram-insights` — Alcance, impressões, seguidores, top posts (feed + stories)
   - `linkedin-insights` — Seguidores, top posts com engagement

4. **Frontend**:
   - `SocialMedia.tsx` — Página com tabs por plataforma, cards de métricas, tabela de top posts com filtro feed/stories
   - Conexões — 2 novos cards (Facebook/Instagram + LinkedIn) com connect/disconnect
   - Sidebar — Item "Redes Sociais" com ícone Share2, visível apenas se houver conexão
   - Hook `useClientConnections` — Flags `facebook`, `instagram`, `linkedin`

### Pendências do usuário

- **Meta App**: Adicionar permissões `pages_show_list`, `pages_read_engagement`, `pages_read_user_content`, `instagram_basic`, `instagram_manage_insights`
- **LinkedIn**: Criar app no Developer Portal, fornecer `LINKEDIN_CLIENT_ID` e `LINKEDIN_CLIENT_SECRET`
