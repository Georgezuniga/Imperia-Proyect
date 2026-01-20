import { pool } from "../db.js";
import { requireFields } from "../utils/validators.js";

export async function createRun(req, res) {
  const missing = requireFields(req.body, ["section_id"]);
  if (missing) return res.status(400).json({ message: `Missing field: ${missing}` });

  const section_id = Number(req.body.section_id);
  if (!Number.isFinite(section_id)) return res.status(400).json({ message: "Invalid section_id" });

  // If there's an in-progress run for this employee+section today, return it
  const existing = await pool.query(
    `SELECT id, employee_id, section_id, status, started_at, submitted_at
     FROM check_runs
     WHERE employee_id=$1
       AND section_id=$2
       AND status='in_progress'
       AND started_at::date = NOW()::date
     ORDER BY started_at DESC
     LIMIT 1`,
    [req.user.id, section_id]
  );
  
  if (existing.rows[0]) return res.status(200).json({ run: existing.rows[0], reused: true });

  const created = await pool.query(
    `INSERT INTO check_runs(employee_id, section_id, status)
     VALUES ($1,$2,'in_progress')
     RETURNING id, employee_id, section_id, status, started_at, submitted_at`,
    [req.user.id, section_id]
  );
  return res.status(201).json({ run: created.rows[0], reused: false });
}


export async function getRunStatus(req, res) {
  const section_id = Number(req.query.section_id);
  if (!Number.isFinite(section_id)) return res.status(400).json({ message: "Invalid section_id" });

  const result = await pool.query(
    `SELECT id, employee_id, section_id, status, started_at, submitted_at, reviewed_at
     FROM check_runs
     WHERE employee_id=$1 AND section_id=$2
     ORDER BY started_at DESC
     LIMIT 1`,
    [req.user.id, section_id]
  );

  return res.status(200).json({ run: result.rows[0] || null });
}

export async function myRuns(req, res) {
  const status = req.query.status;
  const allowed = ["in_progress", "submitted", "reviewed"];
  const statusFilter = allowed.includes(status) ? status : null;

  const result = await pool.query(
    `SELECT r.id, r.section_id, r.status, r.started_at, r.submitted_at, r.reviewed_at,
            s.name AS section_name,
            (SELECT COUNT(*)
               FROM check_items i
              WHERE i.section_id = r.section_id
                AND i.is_active = true) AS items_total,
            (SELECT COUNT(*)
               FROM check_entries e
               JOIN check_items i2 ON i2.id = e.item_id
              WHERE e.run_id = r.id
                AND i2.is_active = true) AS entries_done
     FROM check_runs r
     JOIN sections s ON s.id = r.section_id
     WHERE r.employee_id=$1
       AND ($2::text IS NULL OR r.status=$2)
     ORDER BY r.started_at DESC
     LIMIT 200`,
    [req.user.id, statusFilter]
  );

  return res.json({ runs: result.rows });
}


export async function getRun(req, res) {
  const runId = Number(req.params.id);
  if (!Number.isFinite(runId)) return res.status(400).json({ message: "Invalid run id" });

  // Owner or admin/supervisor can view
  const runRes = await pool.query(
    `SELECT r.*, s.name AS section_name, u.full_name AS employee_name, u.email AS employee_email
     FROM check_runs r
     JOIN sections s ON s.id=r.section_id
     JOIN users u ON u.id=r.employee_id
     WHERE r.id=$1`,
    [runId]
  );
  const run = runRes.rows[0];
  if (!run) return res.status(404).json({ message: "Run not found" });

  const isOwner = run.employee_id === req.user.id;
  const canView = isOwner || ["admin","supervisor"].includes(req.user.role);
  if (!canView) return res.status(403).json({ message: "Forbidden" });

  const entriesRes = await pool.query(
    `SELECT e.id, e.run_id, e.item_id, e.result, e.note, e.photo_url, e.created_at,
            i.title, i.instructions, i.requires_photo, i.requires_note_on_fail, i.sort_order
     FROM check_entries e
     JOIN check_items i ON i.id=e.item_id
     WHERE e.run_id=$1
     ORDER BY i.sort_order ASC, e.created_at ASC`,
    [runId]
  );

  return res.json({ run, entries: entriesRes.rows });
}

export async function upsertEntry(req, res) {
  const runId = Number(req.params.runId);
  if (!Number.isFinite(runId)) return res.status(400).json({ message: "Invalid run id" });

  const missing = requireFields(req.body, ["item_id", "result"]);
  if (missing) return res.status(400).json({ message: `Missing field: ${missing}` });

  const item_id = Number(req.body.item_id);
  const resultVal = String(req.body.result);
  const note = req.body.note ? String(req.body.note) : null;

  if (!["pass","fail","na"].includes(resultVal)) {
    return res.status(400).json({ message: "result must be pass|fail|na" });
  }
  if (!Number.isFinite(item_id)) return res.status(400).json({ message: "Invalid item_id" });

  // Validate run ownership and status
  const runRes = await pool.query("SELECT id, employee_id, status FROM check_runs WHERE id=$1", [runId]);
  const run = runRes.rows[0];
  if (!run) return res.status(404).json({ message: "Run not found" });

  if (run.employee_id !== req.user.id && !["admin","supervisor"].includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (run.status !== "in_progress") {
    return res.status(400).json({ message: "Run is not editable" });
  }

  // Load item rules
  const itemRes = await pool.query(
    "SELECT requires_photo, requires_note_on_fail FROM check_items WHERE id=$1",
    [item_id]
  );
  const item = itemRes.rows[0];
  if (!item) return res.status(400).json({ message: "Item not found" });

  const photo_url = req.file ? `/uploads/checks/${req.file.filename}` : (req.body.photo_url || null);

  if (item.requires_photo && !photo_url) {
    return res.status(400).json({ message: "Este ítem requiere foto" });
  }
  if (item.requires_note_on_fail && resultVal === "fail" && (!note || note.trim().length < 3)) {
    return res.status(400).json({ message: "Debes agregar una descripción cuando es 'No cumple'" });
  }

  const upsert = await pool.query(
    `INSERT INTO check_entries(run_id, item_id, result, note, photo_url)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (run_id, item_id)
     DO UPDATE SET result=EXCLUDED.result, note=EXCLUDED.note, photo_url=COALESCE(EXCLUDED.photo_url, check_entries.photo_url), created_at=NOW()
     RETURNING *`,
    [runId, item_id, resultVal, note, photo_url]
  );

  return res.status(201).json({ entry: upsert.rows[0] });
}

export async function submitRun(req, res) {
  const runId = Number(req.params.id);
  if (!Number.isFinite(runId)) return res.status(400).json({ message: "Invalid run id" });

  const runRes = await pool.query("SELECT id, employee_id, status FROM check_runs WHERE id=$1", [runId]);
  const run = runRes.rows[0];
  if (!run) return res.status(404).json({ message: "Run not found" });

  if (run.employee_id !== req.user.id && !["admin","supervisor"].includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (run.status !== "in_progress") {
    return res.status(400).json({ message: "Run already submitted/reviewed" });
  }

  const countRes = await pool.query("SELECT COUNT(*)::int AS c FROM check_entries WHERE run_id=$1", [runId]);
  if ((countRes.rows[0]?.c || 0) === 0) {
    return res.status(400).json({ message: "No puedes enviar una ronda vacía" });
  }

  const updated = await pool.query(
    `UPDATE check_runs SET status='submitted', submitted_at=NOW()
     WHERE id=$1
     RETURNING id, employee_id, section_id, status, started_at, submitted_at`,
    [runId]
  );

  return res.json({ run: updated.rows[0] });
}
