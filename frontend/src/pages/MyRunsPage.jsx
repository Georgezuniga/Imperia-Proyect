import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useAuth } from "../state/AuthContext.jsx";
import { Link } from "react-router-dom";

export default function MyRunsPage() {
  const { token, user } = useAuth();
  const isAdminView = ["admin", "supervisor"].includes(user?.role);

  // employee mode
  const [runs, setRuns] = useState([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");

  // admin mode
  const [summary, setSummary] = useState(null); // { totals, sections }
  const [secQ, setSecQ] = useState("");
  const [onlyActiveSections, setOnlyActiveSections] = useState(false);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const STATUS = useMemo(
    () => ({
      "": { label: "Todos", cls: "badge" },
      in_progress: { label: "En progreso", cls: "badge badge-info" },
      submitted: { label: "Enviado", cls: "badge badge-warn" },
      reviewed: { label: "Revisado", cls: "badge badge-ok" },
    }),
    []
  );

  // ===== LOAD =====
  useEffect(() => {
    if (!token) return;

    (async () => {
      setErr("");
      setLoading(true);
      try {
        if (isAdminView) {
          const data = await api.admin.dashboardSummary(token);
          setSummary(data || null);
        } else {
          const data = await api.runs.my(status, token);
          setRuns(data?.runs || []);
        }
      } catch (e) {
        setErr(e?.message || "Error cargando");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, status, isAdminView]);

  // ===== EMPLOYEE FILTER =====
  const filteredRuns = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return runs.filter((r) => (r.section_name || "").toLowerCase().includes(qq));
  }, [runs, q]);

  // ===== EMPLOYEE KPIs =====
  const kpiEmployee = useMemo(() => {
    const total = runs.length;
    const inProg = runs.filter((r) => r.status === "in_progress").length;
    const submitted = runs.filter((r) => r.status === "submitted").length;
    const reviewed = runs.filter((r) => r.status === "reviewed").length;
    return { total, inProg, submitted, reviewed };
  }, [runs]);

  // ===== ADMIN FILTER =====
  const filteredSections = useMemo(() => {
    const secs = summary?.sections || [];
    const qq = secQ.trim().toLowerCase();
    return secs.filter((s) => {
      if (onlyActiveSections && !s.is_active) return false;
      if (!qq) return true;
      return (s.section_name || "").toLowerCase().includes(qq);
    });
  }, [summary, secQ, onlyActiveSections]);

  // ===== ADMIN KPIs =====
  const kpiAdmin = useMemo(() => {
    const totals = summary?.totals || {};
    const open = Number(totals.in_progress || 0);
    const sent = Number(totals.submitted || 0);
    const done = Number(totals.reviewed || 0);
    const activeSecs = (summary?.sections || []).filter((s) => !!s.is_active).length;
    return { activeSecs, open, sent, done };
  }, [summary]);

  const fmtTime = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  };

  // ===== RENDER =====
  return (
    <div className="container">
      <div style={{ marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
          <div>
            <h2 style={{ marginBottom: 6 }}>
              {isAdminView ? "Mis registros (Vista admin)" : "Mis registros"}
            </h2>
            <div className="small" style={{ opacity: 0.85 }}>
              {isAdminView
                ? "Resumen global por sección (para supervisar y revisar)."
                : "Filtra por estado o busca por sección."}
            </div>
          </div>

          {/* Link discreto (no estorba, no es redundante visualmente) */}
          {isAdminView && (
            <Link className="btn btnGhost btnTiny" to="/admin/runs">
              Abrir registros →
            </Link>
          )}
        </div>
      </div>

      {err && (
        <div className="alert alertDanger" style={{ marginBottom: 12 }}>
          {err}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card">
          <div className="small">Cargando…</div>
        </div>
      )}

      {/* ===================== ADMIN VIEW ===================== */}
      {!loading && isAdminView && (
        <>
          {/* KPIs admin */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div className="card kpiCard">
              <div className="small">Secciones activas</div>
              <div className="kpiNum">{kpiAdmin.activeSecs}</div>
            </div>

            <div className="card kpiCard kpiWarn">
              <div className="small">Abiertas</div>
              <div className="kpiNum">{kpiAdmin.open}</div>
            </div>

            <div className="card kpiCard kpiInfo">
              <div className="small">Enviadas</div>
              <div className="kpiNum">{kpiAdmin.sent}</div>
            </div>

            <div className="card kpiCard kpiOk">
              <div className="small">Revisadas</div>
              <div className="kpiNum">{kpiAdmin.done}</div>
            </div>
          </div>

          {/* Toolbar admin (PRO) */}
          <div className="adminToolbar">
            <input
              className="input adminSearch"
              placeholder="Buscar sección…"
              value={secQ}
              onChange={(e) => setSecQ(e.target.value)}
            />

            {/* Segmented pro: Todas / Solo activas */}
            <div className="segmented" role="tablist" aria-label="Filtro de secciones">
              <button
                type="button"
                className={"segBtn " + (!onlyActiveSections ? "segBtnActive" : "")}
                onClick={() => setOnlyActiveSections(false)}
                aria-pressed={!onlyActiveSections}
              >
                Todas
              </button>
              <button
                type="button"
                className={"segBtn " + (onlyActiveSections ? "segBtnActive" : "")}
                onClick={() => setOnlyActiveSections(true)}
                aria-pressed={onlyActiveSections}
              >
                Solo activas
              </button>
            </div>
          </div>

          {/* Cards por sección */}
          <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 12 }}>
            {filteredSections.map((s) => {
              const open = Number(s.in_progress || 0);
              const sent = Number(s.submitted || 0);
              const done = Number(s.reviewed || 0);
              const total = open + sent + done;

              const lastRunId = s.last_run_id;
              const lastStatus = s.last_status;
              const lastWho = s.last_employee_name
                ? `${s.last_employee_name} (${s.last_employee_email || ""})`
                : "—";
              const lastTime = fmtTime(s.last_started_at);

              const tone = !total ? "muted" : open ? "warn" : sent ? "info" : "ok";

              return (
                <div
                  key={s.section_id}
                  className={`card cardHover adminSecCard ${!s.is_active ? "dimCard" : ""}`}
                >
                  <div className="row" style={{ justifyContent: "space-between", gap: 14, alignItems: "center" }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <div className="cardTitle" style={{ fontWeight: 950 }}>
                          {s.section_name}
                        </div>

                        <span className={`status status-${tone}`}>
                          {total ? `${total} hoy` : "Sin actividad"}
                        </span>

                        {!s.is_active && <span className="status status-muted">Inactiva</span>}
                      </div>

                      <div className="row" style={{ gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                        <span className="pill">
                          Abiertas: <b>{open}</b>
                        </span>
                        <span className="pill">
                          Enviadas: <b>{sent}</b>
                        </span>
                        <span className="pill">
                          Revisadas: <b>{done}</b>
                        </span>
                        <span className="pill">
                          Último: <b>{lastTime}</b>
                        </span>
                      </div>

                      <div className="muted" style={{ marginTop: 8 }}>
                        Último registro por: <b>{lastWho}</b> · Estado:{" "}
                        <span className={STATUS[lastStatus]?.cls || "badge"}>
                          {STATUS[lastStatus]?.label || lastStatus || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="row" style={{ gap: 10, alignItems: "center" }}>
                      {lastRunId ? (
                        <Link className="btn btnSoft btnAction" to={`/runs/${lastRunId}`}>
                          Ver último
                        </Link>
                      ) : (
                        <button className="btn btnSoft btnAction" disabled>
                          Ver último
                        </button>
                      )}

                      <Link
                        className="btn btnPrimary btnAction btnPrimaryLift"
                        to={`/admin/runs?section_id=${s.section_id}`}
                      >
                        Ver lista
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {!filteredSections.length && (
              <div className="card">
                <div className="small">No hay secciones con esos filtros.</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===================== EMPLOYEE VIEW ===================== */}
      {!loading && !isAdminView && (
        <>
          {/* KPIs employee */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div className="card kpiCard">
              <div className="small">Total</div>
              <div className="kpiNum">{kpiEmployee.total}</div>
            </div>

            <div className="card kpiCard kpiWarn">
              <div className="small">En progreso</div>
              <div className="kpiNum">{kpiEmployee.inProg}</div>
            </div>

            <div className="card kpiCard kpiInfo">
              <div className="small">Enviados</div>
              <div className="kpiNum">{kpiEmployee.submitted}</div>
            </div>

            <div className="card kpiCard kpiOk">
              <div className="small">Revisados</div>
              <div className="kpiNum">{kpiEmployee.reviewed}</div>
            </div>
          </div>

          {/* Toolbar employee */}
          <div className="row" style={{ gap: 10, marginBottom: 14, alignItems: "center" }}>
            <input
              className="input"
              placeholder="Buscar sección…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ flex: 1, minWidth: 220 }}
            />

            <select
              className="select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: 190 }}
            >
              <option value="">Todos</option>
              <option value="in_progress">En progreso</option>
              <option value="submitted">Enviado</option>
              <option value="reviewed">Revisado</option>
            </select>
          </div>

          {/* Listado employee */}
          <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 12 }}>
            {filteredRuns.map((r) => {
              const st = STATUS[r.status] || { label: r.status, cls: "badge" };
              const actionLabel = r.status === "in_progress" ? "Continuar" : "Ver detalle";

              return (
                <div key={r.id} className="card cardHover">
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 14 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 16 }}>{r.section_name}</div>

                      <div className="row" style={{ gap: 10, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span className={st.cls}>{st.label}</span>

                        <span className="small" style={{ opacity: 0.9 }}>
                          Último: {r.started_at ? new Date(r.started_at).toLocaleString() : "—"}
                        </span>
                      </div>
                    </div>

                    <Link className="btn btnPrimary" to={`/runs/${r.id}`}>
                      {actionLabel}
                    </Link>
                  </div>
                </div>
              );
            })}

            {!filteredRuns.length && (
              <p className="small" style={{ marginTop: 8 }}>
                {runs.length ? "No hay resultados con esos filtros." : "Aún no tienes registros."}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
