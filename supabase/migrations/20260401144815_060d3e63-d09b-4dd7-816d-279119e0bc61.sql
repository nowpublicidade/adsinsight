
-- Table: tracking_configs
CREATE TABLE public.tracking_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  metric_name text NOT NULL DEFAULT 'ROAS',
  analysis_period text NOT NULL DEFAULT 'semanal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.tracking_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia tracking_configs" ON public.tracking_configs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Cliente gerencia suas tracking_configs" ON public.tracking_configs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_client_access uca WHERE uca.client_id = tracking_configs.client_id AND uca.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM user_client_access uca WHERE uca.client_id = tracking_configs.client_id AND uca.user_id = auth.uid()));

-- Table: tracking_entries
CREATE TABLE public.tracking_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_name text NOT NULL,
  metric_value numeric NOT NULL,
  daily_budget numeric NOT NULL DEFAULT 0,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia tracking_entries" ON public.tracking_entries
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Cliente gerencia suas tracking_entries" ON public.tracking_entries
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_client_access uca WHERE uca.client_id = tracking_entries.client_id AND uca.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM user_client_access uca WHERE uca.client_id = tracking_entries.client_id AND uca.user_id = auth.uid()));

-- Trigger updated_at for tracking_configs
CREATE TRIGGER update_tracking_configs_updated_at
  BEFORE UPDATE ON public.tracking_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
