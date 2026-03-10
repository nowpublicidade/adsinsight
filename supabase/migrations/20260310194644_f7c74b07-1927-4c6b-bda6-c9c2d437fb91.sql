
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS fb_page_id text,
  ADD COLUMN IF NOT EXISTS fb_page_token text,
  ADD COLUMN IF NOT EXISTS fb_page_connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS ig_account_id text,
  ADD COLUMN IF NOT EXISTS ig_connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS linkedin_access_token text,
  ADD COLUMN IF NOT EXISTS linkedin_refresh_token text,
  ADD COLUMN IF NOT EXISTS linkedin_org_id text,
  ADD COLUMN IF NOT EXISTS linkedin_connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS linkedin_token_expires_at timestamptz;
