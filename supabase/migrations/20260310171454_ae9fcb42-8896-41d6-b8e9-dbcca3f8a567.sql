-- Create optimizations table
CREATE TABLE public.optimizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  objective text NOT NULL,
  hypothesis text NOT NULL,
  applied_test text NOT NULL,
  notes text,
  final_result text,
  status text NOT NULL DEFAULT 'em_progresso',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  next_analysis_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.optimizations ENABLE ROW LEVEL SECURITY;

-- RLS: Admin full access
CREATE POLICY "Admin pode gerenciar otimizações"
ON public.optimizations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: Client access own optimizations
CREATE POLICY "Cliente pode gerenciar suas otimizações"
ON public.optimizations FOR ALL TO authenticated
USING (client_id = public.current_user_client_id())
WITH CHECK (client_id = public.current_user_client_id());

-- Trigger for updated_at
CREATE TRIGGER update_optimizations_updated_at
  BEFORE UPDATE ON public.optimizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();