-- =========================================================
-- IMPERIA PRO 10/10 - Schema compatible con IMPERIA-PRO-10of10
-- =========================================================

BEGIN;

-- (Opcional pero recomendado)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================
-- USERS
-- =========================
DROP TABLE IF EXISTS check_entries CASCADE;
DROP TABLE IF EXISTS check_runs CASCADE;
DROP TABLE IF EXISTS check_items CASCADE;
DROP TABLE IF EXISTS sections CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'employee',
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT users_role_check
    CHECK (role IN ('employee','supervisor','admin'))
);

-- índice útil (login / búsquedas)
CREATE INDEX idx_users_email ON users(email);


-- =========================
-- SECTIONS
-- =========================
CREATE TABLE sections (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sections_active ON sections(is_active);


-- =========================
-- CHECK ITEMS (items por sección)
-- =========================
CREATE TABLE check_items (
  id                    BIGSERIAL PRIMARY KEY,
  section_id            BIGINT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  instructions           TEXT,
  requires_photo        BOOLEAN NOT NULL DEFAULT FALSE,
  requires_note_on_fail BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order            INT NOT NULL DEFAULT 0,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_items_section ON check_items(section_id);
CREATE INDEX idx_items_active ON check_items(is_active);
CREATE INDEX idx_items_section_sort ON check_items(section_id, sort_order);


-- =========================
-- CHECK RUNS (una ronda/registro)
-- =========================
CREATE TABLE check_runs (
  id          BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_id  BIGINT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,

  status      TEXT NOT NULL DEFAULT 'in_progress',
  started_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMP,
  reviewed_at TIMESTAMP,

  reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  review_note TEXT,

  CONSTRAINT check_runs_status_check
    CHECK (status IN ('in_progress','submitted','reviewed'))
);

CREATE INDEX idx_runs_employee ON check_runs(employee_id);
CREATE INDEX idx_runs_section ON check_runs(section_id);
CREATE INDEX idx_runs_status ON check_runs(status);
CREATE INDEX idx_runs_started_at ON check_runs(started_at DESC);


-- =========================
-- CHECK ENTRIES (respuestas por item)
-- =========================
CREATE TABLE check_entries (
  id         BIGSERIAL PRIMARY KEY,
  run_id     BIGINT NOT NULL REFERENCES check_runs(id) ON DELETE CASCADE,
  item_id    BIGINT NOT NULL REFERENCES check_items(id) ON DELETE CASCADE,

  result     TEXT NOT NULL,
  note       TEXT,
  photo_url  TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT check_entries_result_check
    CHECK (result IN ('pass','fail','na')),

  CONSTRAINT uq_entries_run_item UNIQUE (run_id, item_id)
);

CREATE INDEX idx_entries_run ON check_entries(run_id);
CREATE INDEX idx_entries_item ON check_entries(item_id);


-- =========================
-- SEED (opcional) - ejemplo mínimo
-- =========================
INSERT INTO sections (name, is_active) VALUES
('COCINA', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Items demo para COCINA
INSERT INTO check_items (section_id, title, instructions, requires_photo, requires_note_on_fail, sort_order, is_active)
SELECT s.id, x.title, x.instructions, x.requires_photo, x.requires_note_on_fail, x.sort_order, TRUE
FROM sections s
JOIN (
  VALUES
  ('Verificar limpieza de superficie', 'Revisar mesas y zonas de preparación.', FALSE, TRUE, 1),
  ('Verificar stock de insumos', 'Confirmar insumos mínimos del turno.', TRUE,  TRUE, 2),
  ('Verificar refrigeración', 'Temperatura adecuada y puertas cerradas.', FALSE, TRUE, 3)
) AS x(title, instructions, requires_photo, requires_note_on_fail, sort_order)
ON s.name = 'COCINA'
ON CONFLICT DO NOTHING;

COMMIT;
