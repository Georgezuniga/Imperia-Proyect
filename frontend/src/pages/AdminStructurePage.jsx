import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useAuth } from "../state/AuthContext.jsx";

import SectionCard from "../components/SectionCard";
import ItemsList from "../components/ItemsList";

export default function AdminStructurePage() {
  const { token } = useAuth();

  const [sections, setSections] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(null);

  // lista viva DnD
  const [sectionItems, setSectionItems] = useState([]);

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [sectionQuery, setSectionQuery] = useState("");
  const [newSection, setNewSection] = useState("");

  const [newItem, setNewItem] = useState({
    title: "",
    instructions: "",
  });

  async function load() {
    setErr("");
    const data = await api.admin.structure(token);
    const secs = data.sections || [];
    const its = data.items || [];

    setSections(secs);
    setItems(its);

    // si no hay seleccionada, selecciona primera
    if (!selectedSectionId && secs.length) setSelectedSectionId(secs[0].id);

    // si la seleccionada ya no existe, re-selecciona
    if (selectedSectionId && secs.length && !secs.some((s) => s.id === selectedSectionId)) {
      setSelectedSectionId(secs[0].id);
    }
  }

  useEffect(() => {
    if (!token) return;
    load().catch((e) => setErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const selectedSection = useMemo(
    () => sections.find((s) => s.id === selectedSectionId) || null,
    [sections, selectedSectionId]
  );

  useEffect(() => {
    const arr = items.filter((it) => it.section_id === selectedSectionId);
    const sorted = [...arr].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id
    );
    setSectionItems(sorted);
  }, [items, selectedSectionId]);

  const filteredSections = useMemo(() => {
    const q = sectionQuery.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((s) => (s.name || "").toLowerCase().includes(q));
  }, [sections, sectionQuery]);

  const stats = useMemo(() => {
    const total = sectionItems.length;
    const withPhoto = sectionItems.filter((x) => !!x.requires_photo).length;
    const withNote = sectionItems.filter((x) => !!x.requires_note_on_fail).length;
    const active = sectionItems.filter((x) => !!x.is_active).length;
    return { total, withPhoto, withNote, active };
  }, [sectionItems]);

  async function createSection() {
    const name = newSection.trim();
    if (!name) return;

    setBusy(true);
    setErr("");
    try {
      await api.admin.createSection({ name }, token);
      setNewSection("");
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleSection(id, is_active) {
    // optimista
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, is_active } : s)));
    setErr("");
    try {
      await api.admin.updateSection(id, { is_active }, token);
    } catch (e) {
      // rollback
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: !is_active } : s)));
      setErr(e.message);
    }
  }

  async function createItem() {
    if (!selectedSectionId) return;

    const title = newItem.title.trim();
    if (!title) return;

    setBusy(true);
    setErr("");
    try {
      await api.admin.createItem(
        {
          section_id: selectedSectionId,
          title,
          instructions: newItem.instructions.trim() || null,
          requires_photo: false,
          requires_note_on_fail: true,
          sort_order: 0,
          is_active: true,
        },
        token
      );

      setNewItem({ title: "", instructions: "" });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function patchItem(id, patch) {
    // optimista
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    setErr("");
    try {
      await api.admin.updateItem(id, patch, token);
    } catch (e) {
      await load().catch(() => {});
      setErr(e.message);
    }
  }

  async function persistOrder(newItems) {
    setErr("");
    try {
      await Promise.all(
        newItems.map((it) => api.admin.updateItem(it.id, { sort_order: it.sort_order }, token))
      );
    } catch (e) {
      setErr("No se pudo guardar el orden. Reintenta.");
      await load().catch(() => {});
    }
  }

  // ✅ DELETE ITEM PRO (normal o forzado)
  async function deleteItem(itemOrId) {
    const itemId = typeof itemOrId === "object" ? itemOrId.id : Number(itemOrId);
    const itemTitle = typeof itemOrId === "object" ? itemOrId.title : "";

    const ok = confirm(`¿Eliminar este ítem${itemTitle ? `: "${itemTitle}"` : ""}?\n\nSi tiene registros, te preguntaré si quieres forzar.`);
    if (!ok) return;

    setErr("");
    try {
      await api.admin.deleteItem(itemId, token);

      // UI optimista
      setItems((prev) => prev.filter((x) => x.id !== itemId));
      setSectionItems((prev) => prev.filter((x) => x.id !== itemId));
    } catch (e) {
      // Si tiene entries => ofrecer forzado
      const msg = String(e?.message || "");
      const isConflict = msg.includes("entries") || msg.includes("409") || msg.toLowerCase().includes("registros");

      if (isConflict && api.admin.forceDeleteItem) {
        const force = confirm(
          "Este ítem ya tiene registros (entries).\n\n¿Quieres ELIMINAR TAMBIÉN esos registros y borrarlo igual?\n⚠️ Esto borra historial."
        );
        if (!force) {
          setErr(msg);
          return;
        }

        try {
          await api.admin.forceDeleteItem(itemId, token);

          setItems((prev) => prev.filter((x) => x.id !== itemId));
          setSectionItems((prev) => prev.filter((x) => x.id !== itemId));
          setErr("");
        } catch (e2) {
          setErr(e2.message);
        }
        return;
      }

      setErr(msg);
    }
  }

  // ✅ DELETE SECTION PRO (evita stale state)
  async function deleteSection(sectionOrId) {
    const id = typeof sectionOrId === "object" ? sectionOrId.id : Number(sectionOrId);
    const name = typeof sectionOrId === "object" ? sectionOrId.name : "";

    const ok = confirm(
      `¿Eliminar esta sección${name ? `: "${name}"` : ""}?\n\nSi tiene ítems o registros no te dejará (mejor desactivar).`
    );
    if (!ok) return;

    setErr("");
    try {
      await api.admin.deleteSection(id, token);

      // UI optimista
      setSections((prev) => prev.filter((x) => x.id !== id));
      setItems((prev) => prev.filter((x) => x.section_id !== id));
      setSectionItems((prev) => prev.filter((x) => x.section_id !== id));

      // si borraste la seleccionada, seleccionar otra con prev (no con sections viejo)
      setSelectedSectionId((current) => {
        if (current !== id) return current;

        // buscamos una sección que quede (usando callback)
        // OJO: aquí no tenemos el "prev" directo, pero es suficiente:
        // luego el useEffect de load también reacomoda si queda vacío.
        return null;
      });
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="container">
      <div className="pageHeader2">
        <h2>Admin — Estructura</h2>
        <p>Administra secciones e ítems del checklist. Selecciona una sección para ver y editar sus ítems.</p>
      </div>

      {err && <div className="alert alertDanger">{err}</div>}

      <div className="split2">
        {/* LEFT */}
        <div className="panel">
          <div className="panelHead">
            <div>
              <div className="panelTitle">Secciones</div>
              <div className="panelSub">Crea, activa, elimina y selecciona una sección</div>
            </div>
            <span className="badge">Gestión</span>
          </div>

          <div className="panelBody">
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input
                className="search"
                value={sectionQuery}
                onChange={(e) => setSectionQuery(e.target.value)}
                placeholder="Buscar sección…"
              />
            </div>

            <label className="label">Nueva sección</label>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input
                className="input"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                placeholder="COCINA, BAÑOS…"
              />
              <button className="btn btnPrimary" onClick={createSection} disabled={busy || !newSection.trim()}>
                + Crear
              </button>
            </div>

            <div className="stack" style={{ marginTop: 12 }}>
              {filteredSections.map((s) => {
                const count = items.filter((it) => it.section_id === s.id).length;

                return (
                  <SectionCard
                    key={s.id}
                    section={{ ...s, items_count: count }}
                    active={s.id === selectedSectionId}
                    onSelect={() => setSelectedSectionId(s.id)}
                    onToggleActive={(v) => toggleSection(s.id, v)}
                    onDelete={() => deleteSection(s.id)} // ✅ importante
                  />
                );
              })}

              {!filteredSections.length && (
                <div className="emptyState">
                  <div className="emptyTitle">No hay resultados</div>
                  <div className="small">Prueba con otro nombre o crea una nueva sección.</div>
                </div>
              )}

              {!sections.length && (
                <div className="emptyState">
                  <div className="emptyTitle">No hay secciones</div>
                  <div className="small">Crea la primera para empezar.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="panel">
          <div className="panelHead">
            <div>
              <div className="panelTitle">Ítems</div>
              <div className="panelSub">
                {selectedSection ? `Sección: ${selectedSection.name}` : "Selecciona una sección para gestionar ítems"}
              </div>
            </div>

            {selectedSection && (
              <div className="toolbar">
                <span className="badge">{stats.total} ítems</span>
                <span className="badge">{stats.active} activos</span>
                <span className="badge">{stats.withPhoto} con foto</span>
                <span className="badge">{stats.withNote} con nota</span>
                <span className={`badge ${selectedSection.is_active ? "badgeOn" : "badgeOff"}`}>
                  {selectedSection.is_active ? "Activa" : "Inactiva"}
                </span>
              </div>
            )}
          </div>

          <div className="panelBody">
            {!selectedSection ? (
              <div className="emptyState">
                <div className="emptyTitle">Selecciona una sección</div>
                <div className="small">Elige una sección del panel izquierdo para administrar su checklist.</div>
              </div>
            ) : (
              <>
                {/* ✅ Nuevo ítem LIMPIO */}
                <div className="formCard">
                  <div style={{ fontWeight: 900, marginBottom: 10 }}>Nuevo ítem</div>

                  <div className="formGrid2">
                    <div>
                      <label className="label">Título</label>
                      <input
                        className="input"
                        value={newItem.title}
                        onChange={(e) => setNewItem((x) => ({ ...x, title: e.target.value }))}
                        placeholder="Ej: Verificar piso limpio"
                      />
                    </div>

                    <button className="btn btnPrimary" onClick={createItem} disabled={busy || !newItem.title.trim()}>
                      Añadir
                    </button>
                  </div>

                  <label className="label">Instrucciones</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={newItem.instructions}
                    onChange={(e) => setNewItem((x) => ({ ...x, instructions: e.target.value }))}
                    placeholder="Qué revisar / qué evidencia tomar (opcional)"
                  />
                </div>

                <div style={{ height: 12 }} />

                <ItemsList
                  items={sectionItems}
                  setItems={(newList) => {
                    setSectionItems(newList);
                    setItems((prev) => {
                      const map = new Map(newList.map((x) => [x.id, x]));
                      return prev.map((it) => (map.has(it.id) ? { ...it, ...map.get(it.id) } : it));
                    });
                  }}
                  onPersistOrder={persistOrder}
                  onPatchItem={patchItem}
                  onDeleteItem={deleteItem} // ✅ ahora soporta id o item
                />

                {!sectionItems.length && (
                  <div className="emptyState" style={{ marginTop: 12 }}>
                    <div className="emptyTitle">Aún no hay ítems</div>
                    <div className="small">Crea el primer ítem para esta sección.</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
