"use client";

import { Printer } from "lucide-react";
import { buttonClass } from "@/components/button";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass()}>
      <Printer className="h-4 w-4" />
      Print
    </button>
  );
}
