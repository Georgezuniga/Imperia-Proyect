import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api, backendBase } from "../api";
import { useAuth } from "../state/AuthContext.jsx";

function humanResult(v) {
  return v === "pass" ? "Cumple" : v === "fail" ? "No cumple" : v === "na" ? "N/A" : "—";
}

function humanStatus(s) {
  if (s === "reviewed") return "Revisado";
  if (s === "submitted") return "Enviado";
  if (s === "in_progress") return "En progreso";
  return s || "—";
}

function statusTone(s) {
  if (s === "reviewed") return "badgeOk";
  if (s === "submitted") return "badgeInfo";
  if (s === "in_progress") return "badgeWarn";
  return "badgeMuted";
}

function resolvePhotoUrl(raw) {
  if (!raw) return "";
  // Si ya es URL absoluta (Supabase), úsala tal cual
  if (/^https?:\/\//i.test(raw)) return raw;
  // Si es ruta local tipo /uploads/..., usa backendBase
  return `${backendBase}${raw}`;
}

export default function RunDetailPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const runId = Number(id);

  const [run, setRun] = useState(null);
  const [entries, setEntries] = useState([]);
  const [items, setItems] = useState([]);

  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // local form per item
  const [form, setForm] = useState({}); // { [itemId]: { result, note, file, previewUrl } }

  // UI
  const [openId, setOpenId] = useState(null);
  const [savingItemId, setSavingItemId] = useState(null);

  // ✅ Modal preview (premium)
  const [viewer, setViewer] = useState({ open: false, url: "", title: "" });
  const [imgStatus, setImgStatus] = useState("idle"); // idle | loading | ok | err

  async function load() {
    setErr("");
    const data = await api.runs.get(runId, token);
    setRun(data.run);
    setEntries(data.entries || []);

    const itemsData = await api.sections.items(data.run.section_id, token);
    setItems(itemsData.items || []);

    // abre el primer item pendiente (pro UX)
    const map = new Map();
    for (const e of data.entries || []) map.set(e.item_id, e);
    const firstPending = (itemsData.items || []).find((it) => !map.get(it.id));
    setOpenId((prev) => prev ?? (firstPending ? firstPending.id : (itemsData.items || [])[0]?.id ?? null));
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, token]);

  // cerrar modal con ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setViewer({ open: false, url: "", title: "" });
    }
    if (viewer.open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer.open]);

  const entryByItem = useMemo(() => {
    const map = new Map();
    for (const e of entries) map.set(e.item_id, e);
    return map;
  }, [entries]);

  function update(itemId, patch) {
    setForm((prev) => ({ ...prev, [itemId]: { ...(prev[itemId] || {}), ...patch } }));
  }

  function toggleOpen(itemId) {
    setOpenId((prev) => (prev === itemId ? null : itemId));
  }

  function computeBadge(item) {
    const existing = entryByItem.get(item.id);
    const f = form[item.id] || {};
    const hasExisting = !!existing;
    const hasPhotoExisting = !!existing?.photo_url;
    const hasPhotoNew = !!f.file;

    if (!hasExisting) return { cls: "badgeSmall badgePending", txt: "Pendiente" };

    if (item.requires_photo && !hasPhotoExisting && !hasPhotoNew) {
      return { cls: "badgeSmall badgeNeed", txt: "Falta foto" };
    }
    return { cls: "badgeSmall badgeSaved", txt: "Guardado" };
  }

  async function saveItem(item) {
    setSavingItemId(item.id);
    setErr("");

    try {
      const existing = entryByItem.get(item.id);
      const f = form[item.id] || {};

      // Validación PRO: si requiere foto y no hay ni existente ni nueva
      if (item.requires_photo && !existing?.photo_url && !f.file) {
        setErr(`"${item.title}" requiere foto.`);
        return;
      }

      // Validación PRO: si requiere nota al fallar
      const resultToSave = f.result || existing?.result || "pass";
      const noteToSave = (f.note ?? existing?.note ?? "").trim();
      if (item.requires_note_on_fail && resultToSave === "fail" && !noteToSave) {
        setErr(`"${item.title}" requiere nota cuando es "No cumple".`);
        return;
      }

      const fd = new FormData();
      fd.append("item_id", String(item.id));
      fd.append("result", resultToSave);

      if (noteToSave) fd.append("note", noteToSave);
      if (f.file) fd.append("photo", f.file);

      await api.runs.upsertEntry(runId, fd, token);

      // limpiar archivo local (para que no quede “pegado”)
      setForm((prev) => {
        const copy = { ...prev };
        const curr = copy[item.id] || {};
        if (curr.previewUrl) URL.revokeObjectURL(curr.previewUrl);
        copy[item.id] = { ...curr, file: null, previewUrl: "" };
        return copy;
      });

      await load();

      // UX: abrir el siguiente pendiente automáticamente
      const next = items.find((it) => !entryByItem.get(it.id) && it.id !== item.id);
      if (next) setOpenId(next.id);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSavingItemId(null);
    }
  }

  async function submit() {
    setSubmitting(true);
    setErr("");
    try {
      await api.runs.submit(runId, token);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function openViewer(url, title = "Evidencia") {
    if (!url) return;
    setImgStatus("loading");
    setViewer({ open: true, url, title });
  }

  if (!run) {
    return (
      <div className="container">
        <p>Cargando...</p>
        {err && <p style={{ color: "#ff8a8a" }}>{err}</p>}
      </div>
    );
  }

  const editable = run.status === "in_progress" && run.employee_id === user?.id;

  const total = items.length;
  const done = items.filter((it) => !!entryByItem.get(it.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  // Para UI: que “Enviar verificación” se vea serio
  const canSubmit = editable && total > 0 && done === total;

  return (
    <div className="container">
      {/* ✅ MODAL PREMIUM (viewer) */}
      {viewer.open && (
        <div
          className="imperiaModalBackdrop"
          onClick={() => setViewer({ open: false, url: "", title: "" })}
          role="dialog"
          aria-modal="true"
        >
          <div className="imperiaModal" onClick={(e) => e.stopPropagation()}>
            <div className="imperiaModalTop">
              <div className="imperiaModalTitle">{viewer.title}</div>

              <div className="row" style={{ gap: 8 }}>
                <a className="btn btnGhost" href={viewer.url} target="_blank" rel="noreferrer">
                  Abrir aparte
                </a>
                <button className="btn btnPrimary" type="button" onClick={() => setViewer({ open: false, url: "", title: "" })}>
                  Cerrar
                </button>
              </div>
            </div>

            <div className="imperiaModalBody">
              {imgStatus === "loading" && <div className="small">Cargando evidencia...</div>}
              {imgStatus === "err" && (
                <div className="alert alertDanger">
                  No se pudo cargar la imagen. (Revisa que el bucket sea public o la URL sea válida)
                </div>
              )}

              <img
                src={viewer.url}
                alt="Evidencia"
                className="imperiaModalImg"
                onLoad={() => setImgStatus("ok")}
                onError={() => setImgStatus("err")}
              />
            </div>
          </div>
        </div>
      )}

      {/* HERO / HEADER PRO */}
      <div className="runTop">
        <div className="runHero runHeroPro">
          <div className="runHeroLeft">
            <div className="runTitle">
              <span className="runTitleKicker">Registro</span>
              <span className="runTitleSep">—</span>
              <span className="runTitleSection">{run.section_name}</span>
            </div>

            <div className="runMetaRow runHeroChips">
              <span className={`badgeSmall ${statusTone(run.status)}`}>Estado: {humanStatus(run.status)}</span>

              <span className="badgeSmall badgeMuted">
                {done}/{total} ítems
              </span>

              {!editable && <span className="badgeSmall badgePending">Solo lectura</span>}
            </div>
          </div>

          <div className="progressWrap progressWrapPro" aria-label="Progreso del registro">
            <div className="progressTopLine">
              <div className="progressLabel">Progreso</div>
              <div className="progressText">{pct}%</div>
            </div>

            <div className="progressBar progressBarPro" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div style={{ width: `${pct}%` }} />
            </div>

            <div className="progressHint">{done === total ? "Listo para enviar" : "Completa los ítems para enviar"}</div>
          </div>

          <button
            className="btn btnPrimary runSubmitBtn"
            onClick={submit}
            disabled={!canSubmit || submitting}
            title={!canSubmit ? "Completa todos los ítems para enviar" : "Enviar verificación"}
          >
            {submitting ? "Enviando..." : "Enviar verificación"}
          </button>
        </div>

        {err && (
          <div className="alert alertDanger" style={{ marginTop: 12 }}>
            {err}
          </div>
        )}
      </div>

      {/* LISTA PRO */}
      <div className="runList">
        {items.map((item, idx) => {
          const existing = entryByItem.get(item.id);
          const f = form[item.id] || {};

          const resultVal = f.result || existing?.result || "pass";
          const noteVal = f.note ?? existing?.note ?? "";

          // ✅ URL correcta (Supabase o backend local)
          const photoUrl = resolvePhotoUrl(existing?.photo_url);
          const previewUrl = f.previewUrl || "";

          const isOpen = openId === item.id;
          const badge = computeBadge(item);

          return (
            <div className="runCard" key={item.id}>
              {/* HEAD */}
              <div className="runCardHead" onClick={() => toggleOpen(item.id)}>
                <div className="runCardLeft">
                  <div className="runIndex">{idx + 1}</div>
                  <div>
                    <div className="runName">{item.title}</div>
                    <div className="runDesc">{item.instructions || "— sin instrucciones"}</div>
                  </div>
                </div>

                <div className="runCardRight">
                  <span className={badge.cls}>{badge.txt}</span>
                  <span className="badgeSmall">{humanResult(resultVal)}</span>
                  {photoUrl && <span className="badgeSmall">📷</span>}
                </div>
              </div>

              {/* BODY */}
              {isOpen && (
                <div className="runBody" onClick={(e) => e.stopPropagation()}>
                  {/* Resultado (Segmented control) */}
                  <div>
                    <div className="label">Resultado</div>
                    <div className="seg">
                      <button
                        type="button"
                        className={resultVal === "pass" ? "on" : ""}
                        disabled={!editable}
                        onClick={() => update(item.id, { result: "pass" })}
                      >
                        Cumple
                      </button>
                      <button
                        type="button"
                        className={resultVal === "fail" ? "on" : ""}
                        disabled={!editable}
                        onClick={() => update(item.id, { result: "fail" })}
                      >
                        No cumple
                      </button>
                      <button
                        type="button"
                        className={resultVal === "na" ? "on" : ""}
                        disabled={!editable}
                        onClick={() => update(item.id, { result: "na" })}
                      >
                        N/A
                      </button>
                    </div>

                    {item.requires_note_on_fail && resultVal === "fail" && (
                      <div className="small" style={{ marginTop: 8 }}>
                        *Este ítem requiere nota si falla.
                      </div>
                    )}
                  </div>

                  <div className="runGrid">
                    {/* Nota */}
                    <div>
                      <div className="label">Descripción / Observación</div>
                      <input
                        className="input"
                        value={noteVal}
                        disabled={!editable}
                        onChange={(e) => update(item.id, { note: e.target.value })}
                        placeholder="Ej: Se limpió a las 10:20..."
                      />
                    </div>

                    {/* Foto */}
                    <div>
                      <div className="label">Foto</div>

                      <div className="drop">
                        <div className="dropLeft">
                          <div className="dropTitle">{item.requires_photo ? "Foto requerida" : "Foto opcional"}</div>
                          <div className="dropHint">Sube o toma una foto (jpg/png)</div>
                        </div>

                        <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                          {previewUrl && (
                            <button
                              type="button"
                              className="btn btnGhost"
                              onClick={() => openViewer(previewUrl, "Vista previa")}
                            >
                              Ver preview
                            </button>
                          )}

                          {!previewUrl && photoUrl && (
                            <button
                              type="button"
                              className="btn btnGhost"
                              onClick={() => openViewer(photoUrl, "Evidencia")}
                            >
                              Ver foto
                            </button>
                          )}

                          <label className="btn btnGhost" style={{ cursor: editable ? "pointer" : "not-allowed" }}>
                            Elegir foto
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              disabled={!editable}
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                if (!file) return;

                                const url = URL.createObjectURL(file);
                                setForm((prev) => {
                                  const curr = prev[item.id] || {};
                                  if (curr.previewUrl) URL.revokeObjectURL(curr.previewUrl);
                                  return { ...prev, [item.id]: { ...curr, file, previewUrl: url } };
                                });
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="small" style={{ marginTop: 8 }}>
                        {item.requires_photo ? "Este ítem requiere foto." : "Foto opcional."}
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="runActions">
                    <button className="btn" type="button" onClick={() => setOpenId(null)}>
                      Cerrar
                    </button>

                    <button
                      className="btn btnPrimary"
                      type="button"
                      onClick={() => saveItem(item)}
                      disabled={!editable || savingItemId === item.id}
                    >
                      {savingItemId === item.id ? "Guardando..." : "Guardar ítem"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
