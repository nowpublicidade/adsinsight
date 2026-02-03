-- Fase 1: Schema completo do sistema de relatórios Meta Ads + Google Ads

-- 1. Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'client');

-- 2. Tabela de planos de assinatura
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    max_reports INTEGER DEFAULT -1, -- -1 = ilimitado
    max_clients INTEGER DEFAULT -1,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela de clientes (empresas/agências)
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    logo_url TEXT,
    
    -- Meta Ads OAuth
    meta_access_token TEXT,
    meta_token_expires_at TIMESTAMPTZ,
    meta_ad_account_id TEXT,
    meta_user_id TEXT,
    meta_connected_at TIMESTAMPTZ,
    
    -- Google Ads OAuth
    google_access_token TEXT,
    google_refresh_token TEXT,
    google_token_expires_at TIMESTAMPTZ,
    google_customer_id TEXT,
    google_connected_at TIMESTAMPTZ,
    
    -- Plano
    plan_id UUID REFERENCES public.subscription_plans(id),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabela de perfis de usuário
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    full_name TEXT,
    avatar_url TEXT,
    whatsapp TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- 5. Tabela de roles (separada para segurança)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'client',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- 6. Tabela de relatórios
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Tabela de widgets de relatório
CREATE TABLE public.report_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    metric_key TEXT NOT NULL,
    display_name TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'both')),
    visualization_type TEXT NOT NULL DEFAULT 'card' CHECK (visualization_type IN ('card', 'chart', 'both')),
    position INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Função para verificar role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- 9. Função para obter client_id do usuário atual
CREATE OR REPLACE FUNCTION public.current_user_client_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT client_id
    FROM public.user_profiles
    WHERE user_id = auth.uid()
    LIMIT 1
$$;

-- 10. Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 11. Triggers para updated_at
CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_widgets_updated_at
    BEFORE UPDATE ON public.report_widgets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Habilitar RLS em todas as tabelas
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_widgets ENABLE ROW LEVEL SECURITY;

-- 13. RLS Policies

-- subscription_plans: leitura pública, escrita apenas admin
CREATE POLICY "Planos visíveis para todos autenticados"
    ON public.subscription_plans FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Apenas admin pode gerenciar planos"
    ON public.subscription_plans FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- clients: admin vê todos, cliente vê apenas o seu
CREATE POLICY "Admin vê todos os clientes"
    ON public.clients FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Cliente vê apenas seu cliente"
    ON public.clients FOR SELECT
    TO authenticated
    USING (id = public.current_user_client_id());

CREATE POLICY "Admin pode gerenciar clientes"
    ON public.clients FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Cliente pode atualizar seu cliente"
    ON public.clients FOR UPDATE
    TO authenticated
    USING (id = public.current_user_client_id())
    WITH CHECK (id = public.current_user_client_id());

-- user_profiles: usuário vê/edita seu próprio, admin vê todos
CREATE POLICY "Usuário vê seu próprio perfil"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuário pode inserir seu próprio perfil"
    ON public.user_profiles FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuário pode atualizar seu próprio perfil"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin pode gerenciar perfis"
    ON public.user_profiles FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles: apenas admin pode gerenciar, usuário pode ver seu próprio
CREATE POLICY "Usuário vê suas próprias roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admin pode gerenciar roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- reports: admin vê todos, cliente vê apenas do seu client_id
CREATE POLICY "Admin vê todos os relatórios"
    ON public.reports FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Cliente vê relatórios do seu cliente"
    ON public.reports FOR SELECT
    TO authenticated
    USING (client_id = public.current_user_client_id());

CREATE POLICY "Admin pode gerenciar relatórios"
    ON public.reports FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Cliente pode gerenciar seus relatórios"
    ON public.reports FOR ALL
    TO authenticated
    USING (client_id = public.current_user_client_id())
    WITH CHECK (client_id = public.current_user_client_id());

-- report_widgets: mesma lógica dos reports
CREATE POLICY "Admin vê todos os widgets"
    ON public.report_widgets FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Cliente vê widgets dos seus relatórios"
    ON public.report_widgets FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.reports r
            WHERE r.id = report_id
            AND r.client_id = public.current_user_client_id()
        )
    );

CREATE POLICY "Admin pode gerenciar widgets"
    ON public.report_widgets FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Cliente pode gerenciar widgets dos seus relatórios"
    ON public.report_widgets FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.reports r
            WHERE r.id = report_id
            AND r.client_id = public.current_user_client_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.reports r
            WHERE r.id = report_id
            AND r.client_id = public.current_user_client_id()
        )
    );

-- 14. Inserir plano gratuito inicial
INSERT INTO public.subscription_plans (name, description, price, max_reports, max_clients, features)
VALUES (
    'Gratuito',
    'Plano gratuito com acesso ilimitado',
    0,
    -1,
    -1,
    '["Relatórios ilimitados", "Meta Ads", "Google Ads", "Métricas do Pixel"]'::jsonb
);

-- 15. Trigger para criar perfil e role automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Criar perfil básico
    INSERT INTO public.user_profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    
    -- Primeiro usuário será admin, demais serão client
    IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'admin');
    ELSE
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'client');
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();