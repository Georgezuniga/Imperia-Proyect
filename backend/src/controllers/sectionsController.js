import { pool } from "../db.js";
import { requireFields } from "../utils/validators.js";

export async function listSections(req, res) {
  const result = await pool.query(
    "SELECT id, name, is_active, created_at FROM sections WHERE is_active=TRUE ORDER BY name ASC"
  );
  return res.json({ sections: result.rows });
}

export async function listItemsBySection(req, res) {
  const sectionId = Number(req.params.id);
  if (!Number.isFinite(sectionId)) return res.status(400).json({ message: "Invalid section id" });

  const result = await pool.query(
    `SELECT id, section_id, title, instructions, requires_photo, requires_note_on_fail, sort_order, is_active, created_at
     FROM check_items
     WHERE section_id=$1 AND is_active=TRUE
     ORDER BY sort_order ASC, id ASC`,
    [sectionId]
  );
  return res.json({ items: result.rows });
}

// ----------------------
// Admin structure
// ----------------------

export async function adminListStructure(req, res) {
  const sections = await pool.query(
    "SELECT id, name, is_active, created_at FROM sections ORDER BY name ASC"
  );
  const items = await pool.query(
    `SELECT id, section_id, title, instructions, requires_photo, requires_note_on_fail, sort_order, is_active, created_at
     FROM check_items
     ORDER BY section_id ASC, sort_order ASC, id ASC`
  );
  return res.json({ sections: sections.rows, items: items.rows });
}

export async function adminCreateSection(req, res) {
  const missing = requireFields(req.body, ["name"]);
  if (missing) return res.status(400).json({ message: `Missing field: ${missing}` });

  const { name } = req.body;

  const result = await pool.query(
    "INSERT INTO sections(name) VALUES($1) RETURNING id, name, is_active, created_at",
    [String(name).trim().toUpperCase()]
  );
  return res.status(201).json({ section: result.rows[0] });
}

export async function adminUpdateSection(req, res) {
  const sectionId = Number(req.params.id);
  if (!Number.isFinite(sectionId)) return res.status(400).json({ message: "Invalid section id" });

  const { name, is_active } = req.body;

  const updated = await pool.query(
    `UPDATE sections
     SET name = COALESCE($1, name),
         is_active = COALESCE($2, is_active)
     WHERE id=$3
     RETURNING id, name, is_active, created_at`,
    [name !== undefined ? String(name).trim().toUpperCase() : null, is_active !== undefined ? Boolean(is_active) : null, sectionId]
  );

  if (!updated.rows[0]) return res.status(404).json({ message: "Section not found" });
  return res.json({ section: updated.rows[0] });
}

export async function adminCreateItem(req, res) {
  const missing = requireFields(req.body, ["section_id", "title"]);
  if (missing) return res.status(400).json({ message: `Missing field: ${missing}` });

  const { section_id, title, instructions, requires_photo, requires_note_on_fail, sort_order, is_active } = req.body;

  const result = await pool.query(
    `INSERT INTO check_items(section_id, title, instructions, requires_photo, requires_note_on_fail, sort_order, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, section_id, title, instructions, requires_photo, requires_note_on_fail, sort_order, is_active, created_at`,
    [
      Number(section_id),
      String(title).trim(),
      instructions ? String(instructions).trim() : null,
      Boolean(requires_photo),
      requires_note_on_fail === undefined ? true : Boolean(requires_note_on_fail),
      Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0,
      is_active === undefined ? true : Boolean(is_active),
    ]
  );
  return res.status(201).json({ item: result.rows[0] });
}

export async function adminUpdateItem(req, res) {
  const itemId = Number(req.params.id);
  if (!Number.isFinite(itemId)) return res.status(400).json({ message: "Invalid item id" });

  const { title, instructions, requires_photo, requires_note_on_fail, sort_order, is_active } = req.body;

  const updated = await pool.query(
    `UPDATE check_items
     SET title = COALESCE($1, title),
         instructions = COALESCE($2, instructions),
         requires_photo = COALESCE($3, requires_photo),
         requires_note_on_fail = COALESCE($4, requires_note_on_fail),
         sort_order = COALESCE($5, sort_order),
         is_active = COALESCE($6, is_active)
     WHERE id=$7
     RETURNING id, section_id, title, instructions, requires_photo, requires_note_on_fail, sort_order, is_active, created_at`,
    [
      title !== undefined ? String(title).trim() : null,
      instructions !== undefined ? (instructions ? String(instructions).trim() : null) : null,
      requires_photo !== undefined ? Boolean(requires_photo) : null,
      requires_note_on_fail !== undefined ? Boolean(requires_note_on_fail) : null,
      Number.isFinite(Number(sort_order)) ? Number(sort_order) : null,
      is_active !== undefined ? Boolean(is_active) : null,
      itemId
    ]
  );

  if (!updated.rows[0]) return res.status(404).json({ message: "Item not found" });
  return res.json({ item: updated.rows[0] });
}
// ✅ DELETE ITEM (admin/supervisor)
export async function adminDeleteItem(req, res) {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    const del = await pool.query("DELETE FROM items WHERE id = $1 RETURNING id", [id]);

    if (!del.rowCount) {
      return res.status(404).json({ error: "Ítem no encontrado" });
    }

    return res.json({ ok: true, deleted: del.rows[0] });
  } catch (e) {
    // 23503 = foreign_key_violation (tiene registros/entries asociados)
    if (e.code === "23503") {
      return res.status(409).json({
        error: "No se puede eliminar: este ítem ya tiene registros asociados (entries).",
      });
    }
    console.error(e);
    return res.status(500).json({ error: "Error al eliminar ítem" });
  }
}

// ✅ DELETE SECTION (admin/supervisor)
export async function adminDeleteSection(req, res) {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    const del = await pool.query("DELETE FROM sections WHERE id = $1 RETURNING id", [id]);

    if (!del.rowCount) {
      return res.status(404).json({ error: "Sección no encontrada" });
    }

    return res.json({ ok: true, deleted: del.rows[0] });
  } catch (e) {
    // 23503 = foreign_key_violation (tiene items o runs asociados)
    if (e.code === "23503") {
      return res.status(409).json({
        error: "No se puede eliminar: esta sección tiene ítems o registros asociados.",
      });
    }
    console.error(e);
    return res.status(500).json({ error: "Error al eliminar sección" });
  }
}