import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { useAuth } from "../state/AuthContext.jsx";
import { Link } from "react-router-dom";

function statusClass(status) {
  if (status === "reviewed") return "status status-ok";
  if (status === "submitted") return "status status-info";
  if (status === "in_progress") return "status status-warn";
  return "status status-muted";
}

function pickRunDate(run) {
  // reviewed_at > submitted_at > started_at
  const raw = run.reviewed_at || run.submitted_at || run.started_at;
  const d = raw ? new Date(raw) : new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDayTitle(day) {
  try {
    return day.toLocaleDateString("es-PE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return day.toDateString();
  }
}

export default function AdminRunsPage() {
  const { token } = useAuth();
  const [runs, setRuns] = useState([]);
  const [err, setErr] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [selectedRun, setSelectedRun] = useState(null);
  const [busy, setBusy] = useState(false);

  // ===== Persist open/closed days =====
  const STORAGE_KEY = "imperia_admin_runs_open_days_v1";
  const didInit = useRef(false);

  const [openDays, setOpenDays] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openDays));
    } catch {}
  }, [openDays]);

  const toggleDay = (key) => {
    setOpenDays((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  async function load() {
    try {
      setErr("");
      const data = await api.admin.listRuns("", token);
      setRuns(data?.runs || []);
    } catch (e) {
      setErr(e?.message || "Error cargando registros");
    }
  }

  useEffect(() => {
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const groups = useMemo(() => {
    const list = [...(runs || [])];

    // Orden: más reciente primero (por día)
    list.sort((a, b) => pickRunDate(b).getTime() - pickRunDate(a).getTime());

    const map = new Map();
    for (const r of list) {
      const day = pickRunDate(r);
      const key = day.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!map.has(key)) map.set(key, { day, key, runs: [] });
      map.get(key).runs.push(r);
    }

    return Array.from(map.values()).sort((a, b) => b.day.getTime() - a.day.getTime());
  }, [runs]);

  async function review(runId) {
    setBusy(true);
    setErr("");
    try {
      await api.admin.reviewRun(runId, { review_note: reviewNote || "Revisado" }, token);
      setReviewNote("");
      setSelectedRun(null);
      await load();
    } catch (e) {
      setErr(e?.message || "Error al revisar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="pageHeader">
        <div>
          <div className="kicker">Admin</div>
          <div className="pageTitle">Registros</div>

          <div className="runsTopMeta">
            <span className="pill pillSoft">Historial global</span>
            <span className="muted">Ordenados por día</span>
            <span className="dot" />
            <span className="pill pillCount">{runs.length} total</span>
          </div>
        </div>
      </div>

      {err && <p style={{ color: "#ff8a8a" }}>{err}</p>}

      <div className="stack" style={{ marginTop: 12 }}>
        {groups.map((g) => {
          const counts = g.runs.reduce(
            (acc, r) => {
              acc[r.status] = (acc[r.status] || 0) + 1;
              return acc;
            },
            { in_progress: 0, submitted: 0, reviewed: 0 }
          );

          // Default: abierto (pero si quieres, puedes cerrarlo por defecto)
          const isOpen = openDays[g.key] ?? true;

          return (
            <div key={g.key} className={"dayGroup " + (isOpen ? "dayOpen" : "dayClosed")}>
              {/* Header clickeable */}
              <button
                type="button"
                className="dayHeader dayHeaderBtn"
                onClick={() => toggleDay(g.key)}
                aria-expanded={isOpen}
              >
                <div className="dayHeaderLeft">
                  <span className={"chev " + (isOpen ? "chevDown" : "")}>▸</span>
                  <div className="dayTitle">{formatDayTitle(g.day)}</div>
                </div>

                <div className="dayMeta">
                  <span className="chip">{counts.in_progress || 0} en progreso</span>
                  <span className="chip">{counts.submitted || 0} enviados</span>
                  <span className="chip">{counts.reviewed || 0} revisados</span>
                </div>
              </button>

              {/* Contenido colapsable */}
              {isOpen && (
                <div className="stack" style={{ marginTop: 10 }}>
                  {g.runs.map((r) => {
                    const ts = r.reviewed_at || r.submitted_at || r.started_at;

                    return (
                      <div key={r.id} className="card cardHover runRow">
                        <div className="runMain">
                          <div className="runTopLine">
                            <div className="runTitle">
                              <span className="runSection">{r.section_name}</span>
                              <span className={statusClass(r.status)}>
                                {r.status.replace("_", " ")}
                              </span>
                            </div>

                            <div className="runActions">
                              <Link
                                className="btn btnRun"
                                to={`/runs/${r.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                Ver
                              </Link>

                              {r.status !== "reviewed" && (
                                <button
                                  className="btn btnRunPrimary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRun((prev) => (prev === r.id ? null : r.id));
                                  }}
                                >
                                  Revisar
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="runMetaRow">
                            <span className="muted">{r.employee_name}</span>
                            <span className="dot" />
                            <span className="muted">{r.employee_email}</span>
                            <span className="dot" />
                            <span className="muted">{ts ? new Date(ts).toLocaleString() : ""}</span>
                          </div>
                        </div>

                        {selectedRun === r.id && (
                          <div className="runReview" onClick={(e) => e.stopPropagation()}>
                            <label className="label">Nota de revisión</label>
                            <input
                              className="input"
                              value={reviewNote}
                              onChange={(e) => setReviewNote(e.target.value)}
                              placeholder="Ej: OK. Falta foto en ítem X."
                            />
                            <div className="row" style={{ marginTop: 10, justifyContent: "flex-end" }}>
                              <button
                                className="btn btnPrimary"
                                disabled={busy}
                                onClick={() => review(r.id)}
                              >
                                {busy ? "Guardando..." : "Marcar como revisado"}
                              </button>
                              <button className="btn" onClick={() => setSelectedRun(null)}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
