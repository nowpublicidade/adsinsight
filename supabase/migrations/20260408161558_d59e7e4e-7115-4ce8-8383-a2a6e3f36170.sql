
-- Create alert_configs table
CREATE TABLE public.alert_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  whatsapp_instance_name text NOT NULL,
  whatsapp_api_url text NOT NULL,
  whatsapp_api_key text NOT NULL,
  meta_token text NOT NULL,
  recipient_number text NOT NULL,
  schedule_day text NOT NULL,
  schedule_time time NOT NULL,
  report_period text NOT NULL DEFAULT '7dias',
  selected_metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  message_template text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia alert_configs"
  ON public.alert_configs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Cliente gerencia suas alert_configs"
  ON public.alert_configs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_client_access uca
    WHERE uca.client_id = alert_configs.client_id AND uca.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_client_access uca
    WHERE uca.client_id = alert_configs.client_id AND uca.user_id = auth.uid()
  ));

CREATE TRIGGER update_alert_configs_updated_at
  BEFORE UPDATE ON public.alert_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create alert_logs table
CREATE TABLE public.alert_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_config_id uuid NOT NULL REFERENCES public.alert_configs(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  meta_data jsonb,
  message_sent text,
  error_message text
);

ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia alert_logs"
  ON public.alert_logs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Cliente vê seus alert_logs"
  ON public.alert_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_client_access uca
    WHERE uca.client_id = alert_logs.client_id AND uca.user_id = auth.uid()
  ));
