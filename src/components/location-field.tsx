"use client";

import { useState } from "react";
import type { Location } from "@/generated/prisma/client";
import { CUSTOM_LOCATION_VALUE } from "@/lib/location-input";

const inputClass = "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm";

export function LocationField({
  name,
  locations,
  defaultValue,
  defaultCustomText,
  label,
}: {
  name: string;
  locations: Location[];
  defaultValue?: string;
  defaultCustomText?: string;
  label?: string;
}) {
  const [value, setValue] = useState(defaultCustomText ? CUSTOM_LOCATION_VALUE : (defaultValue ?? ""));

  return (
    <div>
      {label && <label className="block text-xs font-medium text-neutral-600">{label}</label>}
      <select
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`${inputClass}${label ? " mt-1" : ""}`}
      >
        <option value="">(None)</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
        <option value={CUSTOM_LOCATION_VALUE}>Other / custom…</option>
      </select>
      {value === CUSTOM_LOCATION_VALUE && (
        <input
          name="customLocationText"
          required
          defaultValue={defaultCustomText}
          placeholder="Describe where it is…"
          className={`${inputClass} mt-2`}
        />
      )}
    </div>
  );
}
