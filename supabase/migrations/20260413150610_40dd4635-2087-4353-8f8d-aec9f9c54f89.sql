
DROP POLICY IF EXISTS "Cliente pode gerenciar widgets dos seus relatórios" ON public.report_widgets;
DROP POLICY IF EXISTS "Cliente vê widgets dos seus relatórios" ON public.report_widgets;

CREATE POLICY "Cliente pode gerenciar widgets dos seus relatórios"
ON public.report_widgets
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM reports r
    JOIN user_client_access uca ON uca.client_id = r.client_id
    WHERE r.id = report_widgets.report_id
    AND uca.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM reports r
    JOIN user_client_access uca ON uca.client_id = r.client_id
    WHERE r.id = report_widgets.report_id
    AND uca.user_id = auth.uid()
  )
);
