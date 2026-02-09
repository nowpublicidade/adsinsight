
-- Add Google Analytics fields to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS ga_property_id text,
ADD COLUMN IF NOT EXISTS ga_access_token text,
ADD COLUMN IF NOT EXISTS ga_refresh_token text,
ADD COLUMN IF NOT EXISTS ga_connected_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS ga_token_expires_at timestamp with time zone;
