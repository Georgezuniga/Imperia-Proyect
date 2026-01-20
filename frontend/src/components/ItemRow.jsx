import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Switch } from "./Switch";

export default function ItemRow({ id, item, onPatchItem, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: "none",
    opacity: isDragging ? 0.95 : 1,
  };

  const enabled = !!item.is_active;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`itemRow ${isDragging ? "dragging" : ""} ${enabled ? "" : "itemRowOff"}`}
    >
      {/* Handle */}
      <div className="dragHandle" {...attributes} {...listeners} title="Arrastrar">
        ⋮⋮
      </div>

      {/* Main */}
      <div className="itemMain">
        <div className="itemTitle">{item.title}</div>
        <div className="itemDesc">{item.instructions ? item.instructions : "— sin instrucciones"}</div>
      </div>

      {/* Flags */}
      <div className="itemFlags">
        <Switch
          checked={!!item.requires_photo}
          onChange={(v) => onPatchItem(item.id, { requires_photo: v })}
          label="Foto"
          stopPropagation
        />
        <Switch
          checked={!!item.requires_note_on_fail}
          onChange={(v) => onPatchItem(item.id, { requires_note_on_fail: v })}
          label="Nota"
          stopPropagation
        />

        {/* ✅ Botón Active tipo “pill” */}
        <button
          className={`activePill ${enabled ? "on" : "off"}`}
          onClick={(e) => {
            e.stopPropagation();
            onPatchItem(item.id, { is_active: !enabled });
          }}
          type="button"
          title={enabled ? "Desactivar" : "Activar"}
        >
          <span className="dot" />
          {enabled ? "Activo" : "Inactivo"}
        </button>

        {/* ✅ Delete icon (hover) */}
        <button
          className="iconBtn danger"
          type="button"
          title="Eliminar ítem"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(item);
          }}
        >
          🗑
        </button>
      </div>
    </div>
  );
}
