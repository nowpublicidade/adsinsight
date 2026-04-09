
ALTER TABLE public.alert_configs ADD COLUMN channel text NOT NULL DEFAULT 'meta';
ALTER TABLE public.alert_configs ALTER COLUMN meta_token DROP NOT NULL;
ALTER TABLE public.alert_configs ALTER COLUMN meta_token SET DEFAULT '';
