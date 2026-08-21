"use client";

import type { ReactNode } from "react";

export function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`rounded px-2 py-1 text-sm transition-colors duration-150 ${
        active ? "bg-fuchsia-100 text-fuchsia-800" : "text-neutral-600 hover:bg-neutral-200"
      }`}
    >
      {children}
    </button>
  );
}
