"use client";

import { Button } from "@/components/button";

export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      Print
    </Button>
  );
}
