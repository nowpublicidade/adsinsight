
-- Drop existing client policies that use current_user_client_id()
DROP POLICY IF EXISTS "Cliente pode gerenciar seus relatórios" ON public.reports;
DROP POLICY IF EXISTS "Cliente vê relatórios do seu cliente" ON public.reports;

-- Recreate using user_client_access
CREATE POLICY "Cliente pode gerenciar seus relatórios"
ON public.reports
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_client_access uca
    WHERE uca.client_id = reports.client_id
    AND uca.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_client_access uca
    WHERE uca.client_id = reports.client_id
    AND uca.user_id = auth.uid()
  )
);
