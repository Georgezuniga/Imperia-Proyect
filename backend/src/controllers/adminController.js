import { pool } from "../db.js";
import { requireFields } from "../utils/validators.js";

export async function listRuns(req, res) {
  const { status, section_id, employee_id, date_from, date_to } = req.query;

  const allowedStatus = ["in_progress","submitted","reviewed"];
  const st = allowedStatus.includes(status) ? status : null;

  const sid = section_id ? Number(section_id) : null;
  const eid = employee_id ? Number(employee_id) : null;

  const result = await pool.query(
    `SELECT r.id, r.employee_id, u.full_name AS employee_name, u.email AS employee_email,
            r.section_id, s.name AS section_name,
            r.status, r.started_at, r.submitted_at, r.reviewed_at, r.review_note, r.reviewed_by
     FROM check_runs r
     JOIN users u ON u.id=r.employee_id
     JOIN sections s ON s.id=r.section_id
     WHERE ($1::text IS NULL OR r.status=$1)
       AND ($2::int IS NULL OR r.section_id=$2)
       AND ($3::int IS NULL OR r.employee_id=$3)
       AND ($4::timestamptz IS NULL OR r.started_at >= $4)
       AND ($5::timestamptz IS NULL OR r.started_at <= $5)
     ORDER BY r.started_at DESC
     LIMIT 500`,
    [st, sid, eid, date_from || null, date_to || null]
  );

  return res.json({ runs: result.rows });
}


export async function dashboardSummary(req, res) {
  // Totales del día (puedes cambiar a rango si quieres)
  const totals = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE r.status='in_progress') AS in_progress,
      COUNT(*) FILTER (WHERE r.status='submitted')  AS submitted,
      COUNT(*) FILTER (WHERE r.status='reviewed')   AS reviewed
    FROM check_runs r
    WHERE r.started_at::date = CURRENT_DATE
  `);

  // Resumen por sección: último run del día + conteo por estado
  const bySection = await pool.query(`
    WITH today AS (
      SELECT *
      FROM check_runs
      WHERE started_at::date = CURRENT_DATE
    ),
    last_run AS (
      SELECT DISTINCT ON (section_id)
        id, section_id, employee_id, status, started_at, submitted_at, reviewed_at
      FROM today
      ORDER BY section_id, started_at DESC
    )
    SELECT
      s.id AS section_id,
      s.name AS section_name,
      s.is_active,
      COALESCE(t.in_progress,0) AS in_progress,
      COALESCE(t.submitted,0)   AS submitted,
      COALESCE(t.reviewed,0)    AS reviewed,
      lr.id        AS last_run_id,
      lr.status    AS last_status,
      lr.started_at AS last_started_at,
      u.full_name  AS last_employee_name,
      u.email      AS last_employee_email
    FROM sections s
    LEFT JOIN (
      SELECT section_id,
        COUNT(*) FILTER (WHERE status='in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status='submitted')  AS submitted,
        COUNT(*) FILTER (WHERE status='reviewed')   AS reviewed
      FROM today
      GROUP BY section_id
    ) t ON t.section_id = s.id
    LEFT JOIN last_run lr ON lr.section_id = s.id
    LEFT JOIN users u ON u.id = lr.employee_id
    ORDER BY s.name ASC
  `);

  return res.json({
    totals: totals.rows[0],
    sections: bySection.rows
  });
}

export async function reviewRun(req, res) {
  const runId = Number(req.params.id);
  if (!Number.isFinite(runId)) return res.status(400).json({ message: "Invalid run id" });

  const missing = requireFields(req.body, ["review_note"]);
  if (missing) return res.status(400).json({ message: `Missing field: ${missing}` });

  const { review_note } = req.body;

  const runRes = await pool.query("SELECT id, status FROM check_runs WHERE id=$1", [runId]);
  const run = runRes.rows[0];
  if (!run) return res.status(404).json({ message: "Run not found" });
  if (run.status === "in_progress") {
    return res.status(400).json({ message: "Primero debe estar enviado (submitted)" });
  }

  const updated = await pool.query(
    `
    UPDATE check_runs
    SET
      status = 'reviewed',
      reviewed_at = NOW(),
      reviewed_by = $1,
      review_note = $2
    WHERE id = $3
    RETURNING *
    `,
    [req.user.id, (review_note || "").trim() || null, runId]
  );

  return res.json({ run: updated.rows[0] });
}

/**
 * ✅ DELETE RUN (admin/supervisor)
 * Borra todas sus entries y luego el run.
 */
export async function deleteRun(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid run id" });

  const run = await pool.query("SELECT id FROM check_runs WHERE id=$1", [id]);
  if (!run.rowCount) return res.status(404).json({ message: "Registro no encontrado" });

  await pool.query("BEGIN");
  try {
    await pool.query("DELETE FROM check_entries WHERE run_id=$1", [id]);
    await pool.query("DELETE FROM check_runs WHERE id=$1", [id]);
    await pool.query("COMMIT");
    return res.json({ ok: true });
  } catch (e) {
    await pool.query("ROLLBACK");
    return res.status(500).json({ message: "Error eliminando registro" });
  }
}



export async function listUsers(req, res) {
  const result = await pool.query(
    "SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 200"
  );
  return res.json({ users: result.rows });
}

export async function setUserRole(req, res) {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) return res.status(400).json({ message: "Invalid user id" });

  const missing = requireFields(req.body, ["role"]);
  if (missing) return res.status(400).json({ message: `Missing field: ${missing}` });

  const role = String(req.body.role);
  if (!["employee","supervisor","admin"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const updated = await pool.query(
    "UPDATE users SET role=$1 WHERE id=$2 RETURNING id, full_name, email, role, created_at",
    [role, userId]
  );
  if (!updated.rows[0]) return res.status(404).json({ message: "User not found" });

  return res.json({ user: updated.rows[0] });
}

export async function deleteItem(req, res) {
  const id = Number(req.params.id);
  const force = String(req.query.force || "") === "1";

  const item = await pool.query("SELECT id, section_id FROM check_items WHERE id=$1", [id]);
  if (!item.rowCount) return res.status(404).json({ message: "Ítem no encontrado" });

  const dep = await pool.query("SELECT 1 FROM check_entries WHERE item_id=$1 LIMIT 1", [id]);
  if (dep.rowCount && !force) {
    return res.status(409).json({
      message: "No se puede eliminar: el ítem ya tiene registros (entries). Desactívalo o usa eliminación forzada.",
      code: "HAS_ENTRIES",
    });
  }

  await pool.query("BEGIN");
  try {
    if (force) {
      await pool.query("DELETE FROM check_entries WHERE item_id=$1", [id]);
    }
    await pool.query("DELETE FROM check_items WHERE id=$1", [id]);
    await pool.query("COMMIT");
    return res.json({ ok: true });
  } catch (e) {
    await pool.query("ROLLBACK");
    return res.status(500).json({ message: "Error eliminando ítem" });
  }
}

export async function deleteSection(req, res) {
  const id = Number(req.params.id);

  const sec = await pool.query("SELECT id FROM sections WHERE id=$1", [id]);
  if (!sec.rowCount) return res.status(404).json({ message: "Sección no encontrada" });

  const hasItems = await pool.query("SELECT 1 FROM check_items WHERE section_id=$1 LIMIT 1", [id]);
  if (hasItems.rowCount) {
    return res.status(409).json({
      message: "No se puede eliminar: la sección tiene ítems. Elimina los ítems primero o desactiva la sección.",
    });
  }

  const hasRuns = await pool.query("SELECT 1 FROM check_runs WHERE section_id=$1 LIMIT 1", [id]);
  if (hasRuns.rowCount) {
    return res.status(409).json({
      message: "No se puede eliminar: la sección tiene registros (runs). Desactívala en lugar de eliminar.",
    });
  }

  await pool.query("DELETE FROM sections WHERE id=$1", [id]);
  return res.json({ ok: true });
}