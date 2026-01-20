BEGIN;

-- 1) Borrar datos dependientes primero (hijos)
-- Entradas / evidencias de cada ítem en un run
TRUNCATE TABLE check_run_entries RESTART IDENTITY CASCADE;

-- 2) Borrar runs
TRUNCATE TABLE check_runs RESTART IDENTITY CASCADE;

-- 3) Mantener estructura base (secciones + ítems)
-- Si quieres limpiar SOLO registros de pruebas y mantener tus secciones/ítems reales, NO truncar estos.
-- Si quieres limpiar TODO incluyendo secciones/ítems, descomenta estas 2 líneas:
-- TRUNCATE TABLE check_items RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE sections RESTART IDENTITY CASCADE;

-- 4) Usuarios: normalmente NO se borra.
-- Si quieres resetear usuarios de pruebas también, descomenta:
-- TRUNCATE TABLE users RESTART IDENTITY CASCADE;

COMMIT;
