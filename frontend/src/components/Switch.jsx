import React from "react";

export function Switch({ checked, onChange, label, disabled, stopPropagation }) {
  return (
    <button
      type="button"
      className={["sw", checked ? "swOn" : "", disabled ? "swDisabled" : ""].join(" ")}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        if (disabled) return;
        onChange(!checked);
      }}
      aria-pressed={checked}
    >
      <span className="swThumb" />
      <span className="swLabel">{label}</span>
    </button>
  );
}
