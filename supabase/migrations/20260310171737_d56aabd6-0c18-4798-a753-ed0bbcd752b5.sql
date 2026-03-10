-- Drop restrictive policies
DROP POLICY "Admin pode gerenciar otimizações" ON public.optimizations;
DROP POLICY "Cliente pode gerenciar suas otimizações" ON public.optimizations;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Admin pode gerenciar otimizações"
ON public.optimizations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Cliente pode gerenciar suas otimizações"
ON public.optimizations FOR ALL TO authenticated
USING (client_id = public.current_user_client_id())
WITH CHECK (client_id = public.current_user_client_id());