

## Plano: Conexao de Redes Sociais (Instagram, Facebook, LinkedIn)

### Contexto

Diferente do Meta Ads e Google Ads (que usam APIs de anuncios), aqui queremos dados **organicos** das paginas/perfis sociais: alcance, visualizacoes, seguidores, curtidas, comentarios e melhores posts.

---

### APIs Necessarias

| Rede | API | Autenticacao |
|---|---|---|
| Instagram | Instagram Graph API (via Facebook) | OAuth via Meta (mesmo app) |
| Facebook | Facebook Graph API (Page Insights) | OAuth via Meta (mesmo app) |
| LinkedIn | LinkedIn Marketing API | OAuth separado (novo app) |

---

### Acoes do Usuario (voce)

1. **Meta App (Instagram + Facebook)**
   - No [Meta for Developers](https://developers.facebook.com/), adicionar as permissoes ao seu Meta App existente:
     - `pages_show_list`, `pages_read_engagement`, `pages_read_user_content`
     - `instagram_basic`, `instagram_manage_insights`
   - Solicitar revisao do app se necessario (para uso em producao)

2. **LinkedIn App**
   - Criar um app no [LinkedIn Developer Portal](https://developer.linkedin.com/)
   - Solicitar os produtos: "Sign In with LinkedIn using OpenID Connect" + "Community Management API"
   - Obter `LINKEDIN_CLIENT_ID` e `LINKEDIN_CLIENT_SECRET`
   - Configurar redirect URI: `https://hdusdrzyppasiwqkqomv.supabase.co/functions/v1/linkedin-oauth-callback`
   - Me informar os valores do Client ID e Client Secret para eu armazenar como secrets

---

### Acoes Minhas (Lovable)

#### 1. Banco de Dados — Novas colunas na tabela `clients`

```sql
-- Facebook Page
fb_page_id text,
fb_page_token text,
fb_page_connected_at timestamptz,

-- Instagram (via Facebook Page)
ig_account_id text,
ig_connected_at timestamptz,

-- LinkedIn
linkedin_access_token text,
linkedin_refresh_token text,
linkedin_org_id text,
linkedin_connected_at timestamptz,
linkedin_token_expires_at timestamptz
```

#### 2. Edge Functions — OAuth

| Funcao | Descricao |
|---|---|
| `social-meta-oauth-start` | Inicia OAuth Meta com scopes de Pages + Instagram |
| `social-meta-oauth-callback` | Troca code por token, busca Page ID e IG account ID, salva no client |
| `linkedin-oauth-start` | Inicia OAuth LinkedIn |
| `linkedin-oauth-callback` | Troca code por token, busca Organization ID, salva no client |

#### 3. Edge Functions — Dados

| Funcao | Descricao |
|---|---|
| `facebook-page-insights` | Alcance, visualizacoes, curtidas, comentarios da Page + melhores posts do Feed |
| `instagram-insights` | Alcance, impressoes, seguidores, curtidas, comentarios + melhores posts (Feed e Stories) |
| `linkedin-insights` | Seguidores, impressoes, engajamento + melhores posts |

#### 4. Frontend — Nova pagina `SocialMedia.tsx`

- Secoes separadas por plataforma (so exibe se conectada)
- Cards de metricas: Alcance, Visualizacoes, Seguidores, Curtidas, Comentarios
- Tabela de "Melhores Posts" com filtro por canal (Stories / Feed)
- Seletor de periodo (7d, 14d, 30d)

#### 5. Frontend — Conexoes

- Adicionar 3 novos cards na pagina de Conexoes: Facebook Page, Instagram, LinkedIn
- Mesma logica existente: input de ID + botao conectar/desconectar

#### 6. Navegacao

- Adicionar item "Redes Sociais" no sidebar com icone apropriado
- Rota: `/dashboard/social-media`

#### 7. Hook `useClientConnections`

- Adicionar flags: `facebook`, `instagram`, `linkedin`

---

### Ordem de Implementacao

1. Migracoes do banco (novas colunas)
2. OAuth do Meta (Facebook + Instagram) — reutiliza credenciais existentes
3. OAuth do LinkedIn — aguarda secrets do usuario
4. Edge functions de insights
5. Pagina de Redes Sociais
6. Cards de conexao
7. Navegacao e rotas

---

### Dependencia Critica

Para o LinkedIn, preciso que voce crie o app e me forneca `LINKEDIN_CLIENT_ID` e `LINKEDIN_CLIENT_SECRET`. Posso comecar pelo Facebook/Instagram imediatamente pois ja temos `META_APP_ID` e `META_APP_SECRET`.

