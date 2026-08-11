"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Öffnet den Druckdialog des Browsers (für die QR-Etikett-Seite). */
export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer size={16} /> Drucken
    </Button>
  );
}
