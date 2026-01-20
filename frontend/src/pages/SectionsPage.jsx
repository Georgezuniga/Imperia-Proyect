import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useAuth } from "../state/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

function formatLocalDate(d = new Date()) {
  try {
    return new Intl.DateTimeFormat("es-PE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

function statusBadge(status) {
  if (status === "in_progress") return { label: "En progreso", tone: "warn" };
  if (status === "submitted") return { label: "Enviado", tone: "info" };
  if (status === "reviewed") return { label: "Revisado", tone: "ok" };
  return { label: "Sin registro", tone: "muted" };
}

function timeAgo(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  const days = Math.round(hrs / 24);
  return `Hace ${days} d`;
}

export default function SectionsPage() {
  const { token } = useAuth();
  const nav = useNavigate();

  const [sections, setSections] = useState([]);
  const [meta, setMeta] = useState({}); // { [sectionId]: { itemsCount, run } }
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);

  const todayLabel = useMemo(() => formatLocalDate(new Date()), []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await api.sections.list(token);
        const secs = data.sections || [];
        setSections(secs);

        const entries = await Promise.all(
          secs.map(async (s) => {
            try {
              const [itemsRes, statusRes] = await Promise.all([
                api.sections.items(s.id, token),
                api.runs.status(s.id, token),
              ]);
              return [s.id, { itemsCount: (itemsRes.items || []).length, run: statusRes.run }];
            } catch {
              return [s.id, { itemsCount: null, run: null }];
            }
          })
        );

        const next = {};
        for (const [id, v] of entries) next[id] = v;
        setMeta(next);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function start(section_id) {
    setBusyId(section_id);
    setErr("");
    try {
      const data = await api.runs.create({ section_id }, token);
      nav(`/runs/${data.run.id}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  }

  // ===== Stats PRO (arriba) =====
  const topStats = useMemo(() => {
    let active = sections.length;
    let open = 0;
    let submitted = 0;
    let reviewed = 0;

    for (const s of sections) {
      const run = meta[s.id]?.run;
      const st = run?.status;
      if (st === "in_progress") open++;
      else if (st === "submitted") submitted++;
      else if (st === "reviewed") reviewed++;
    }
    return { active, open, submitted, reviewed };
  }, [sections, meta]);

  return (
    <div className="container">
      <div className="pageHeader">
        <div className="stack" style={{ gap: 6 }}>
          <div className="kicker">Secciones operativas</div>
          <h1 className="pageTitle">Registros del día</h1>
          <div className="pageMeta">
            <span className="chip">{todayLabel}</span>
            <span className="dot" />
            <span className="muted">Elige una sección para iniciar o continuar una ronda.</span>
          </div>
        </div>
      </div>

      {err && <div className="alert alertDanger">{err}</div>}

      {/* ===== TOP STATS ===== */}
      {!loading && (
        <div className="secStats">
          <div className="secStat">
            <div className="secStatLabel">Activas</div>
            <div className="secStatValue">{topStats.active}</div>
          </div>
          <div className="secStat secStatWarn">
            <div className="secStatLabel">Abiertas</div>
            <div className="secStatValue">{topStats.open}</div>
          </div>
          <div className="secStat secStatInfo">
            <div className="secStatLabel">Enviadas</div>
            <div className="secStatValue">{topStats.submitted}</div>
          </div>
          <div className="secStat secStatOk">
            <div className="secStatLabel">Revisadas</div>
            <div className="secStatValue">{topStats.reviewed}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="gridCards">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card cardSkeleton">
              <div className="skeletonLine w40" />
              <div className="skeletonLine w70" />
              <div className="skeletonLine w55" />
              <div className="skeletonBtn" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="gridCards">
            {sections.map((s) => {
              const m = meta[s.id] || {};
              const itemsCount = m.itemsCount;
              const run = m.run;
              const status = run?.status || null;
              const badge = statusBadge(status);

              const primaryLabel = status === "in_progress" ? "Continuar" : "Iniciar";

              const secondaryText =
                status === "in_progress"
                  ? "Tienes un registro abierto en esta sección."
                  : status === "submitted"
                    ? "Ya enviaste el último registro. Puedes iniciar uno nuevo."
                    : status === "reviewed"
                      ? "El último registro ya fue revisado."
                      : "Aún no hay registros recientes.";

              const accent =
                status === "in_progress"
                  ? "accent-warn"
                  : status === "submitted"
                    ? "accent-info"
                    : status === "reviewed"
                      ? "accent-ok"
                      : "accent-muted";

              const isHot = status === "in_progress";

              return (
                <div key={s.id} className={`secCard2 ${accent} ${isHot ? "secCardHot" : ""}`}>
                  <div className="secCard2Top">
                    <div className="secCard2Left">
                      <div className="secCard2Title" title={s.name}>{s.name}</div>
                      <div className="secCard2Meta">
                        <span className="pill">
                          {itemsCount === null ? "Ítems: —" : `${itemsCount} ítems`}
                        </span>
                        <span className="pill">
                          Último: {run?.started_at ? timeAgo(run.started_at) : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="secCard2Right">
                      <span className={`status status-${badge.tone}`}>{badge.label}</span>
                    </div>
                  </div>

                  <div className="secCard2Mid">{secondaryText}</div>

                  <div className="secCard2Bottom">
                    <button
                      className={`btn btnPrimary btnWide ${isHot ? "btnPulse" : ""}`}
                      onClick={() => start(s.id)}
                      disabled={busyId === s.id}
                    >
                      {busyId === s.id ? "Abriendo..." : primaryLabel}
                    </button>

                    <div className="hint">
                      Tip: completa todo y <b>envía</b> para que quede listo para revisión.
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!sections.length && (
            <div className="card emptyState">
              <div className="emptyTitle">No hay secciones activas</div>
              <div className="muted">Pídele al admin que cree una sección e ítems desde “Admin — Estructura”.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
