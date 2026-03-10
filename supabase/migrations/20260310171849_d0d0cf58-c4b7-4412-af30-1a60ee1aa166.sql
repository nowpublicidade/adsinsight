-- Drop old client policy
DROP POLICY "Cliente pode gerenciar suas otimizações" ON public.optimizations;

-- Recreate using user_client_access (same pattern as clients table)
CREATE POLICY "Cliente pode gerenciar suas otimizações"
ON public.optimizations FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_client_access uca
  WHERE uca.client_id = optimizations.client_id
    AND uca.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM user_client_access uca
  WHERE uca.client_id = optimizations.client_id
    AND uca.user_id = auth.uid()
));