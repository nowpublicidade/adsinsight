
DROP POLICY IF EXISTS "Cliente pode atualizar seu cliente" ON public.clients;

CREATE POLICY "Cliente pode atualizar seu cliente" ON public.clients
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_client_access uca
    WHERE uca.client_id = clients.id AND uca.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_client_access uca
    WHERE uca.client_id = clients.id AND uca.user_id = auth.uid()
  )
);
