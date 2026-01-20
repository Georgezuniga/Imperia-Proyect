BEGIN;

-- 1) Asegurar columnas correctas (no rompe si ya existen)
ALTER TABLE sections
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE check_items
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2) Si tu DB antigua tenía "active", renómbrala (solo si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='check_items' AND column_name='active'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='check_items' AND column_name='is_active'
  ) THEN
    ALTER TABLE check_items RENAME COLUMN active TO is_active;
  END IF;
END $$;

-- 3) Constraints / defaults seguros (si faltan)
ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'employee';

-- 4) Registrar migración aplicada (si tienes schema_migrations)
INSERT INTO schema_migrations(name)
VALUES ('003_safe_updates.sql')
ON CONFLICT (name) DO NOTHING;

COMMIT;
