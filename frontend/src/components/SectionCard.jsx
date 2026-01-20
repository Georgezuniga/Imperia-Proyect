import React from "react";
import { Switch } from "./Switch";

export default function SectionCard({
  section,
  active,
  onSelect,
  onToggleActive,
  onDelete, // ✅ nuevo
}) {
  const enabled = !!section.is_active;

  return (
    <div
      role="button"
      tabIndex={0}
      className={["secCard", active ? "secCardActive" : "", enabled ? "" : "secCardDisabled"].join(" ")}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
    >
      <div className="secTop">
        <div>
          <div className="secName">{section.name}</div>
          <div className="secMeta">{section.items_count ?? 0} ítems</div>
        </div>

        <div className="secRight">
          <span className={["badge", enabled ? "badgeOn" : "badgeOff"].join(" ")}>
            {enabled ? "Activa" : "Inactiva"}
          </span>

          {/* ✅ Delete (aparece al hover) */}
          <button
            className="iconBtn danger"
            title="Eliminar sección"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete?.(section.id);
            }}
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="secBottom">
        <Switch
          checked={enabled}
          onChange={onToggleActive}
          label="Habilitada"
          disabled={false}
          stopPropagation
        />
      </div>
    </div>
  );
}
