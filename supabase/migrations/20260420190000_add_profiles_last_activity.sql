-- Campo para controlar inactividad de admin sin depender de cookies client-side.
-- El proxy del web-admin actualiza este campo en cada request y chequea el
-- límite de 8h contra él. Migración de cookie httpOnly (frágil) a state server-side.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_profiles_last_activity
  ON public.profiles(last_activity_at);
