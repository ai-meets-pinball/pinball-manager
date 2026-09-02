"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { ManualExtract } from "@/components/manual-extract";
import type { AiProvider } from "@/lib/ai/provider";

/*
  Kompakter Knopf „Handbuch auswerten" im Kopf des Handbuch-Reiters — öffnet
  den bestehenden Extraktions-Bereich (ManualExtract: App-KI ODER eigenes
  ChatGPT-/Claude-Abo) in einem Dialog, statt als Vollbreiten-Klappe unter den
  Fakten (P3). Der Dialog bleibt nach dem Auswerten offen, damit die Zusammen-
  fassung („Extrahiert: …") lesbar ist; die Seite hinter ihm ist bereits
  aktualisiert (router.refresh in ManualUpload).
*/
export function HandbuchAuswerten({
  machineId,
  providers,
  centralKey,
}: {
  machineId: string;
  providers: AiProvider[];
  centralKey: boolean;
}) {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOffen(true)}
      >
        <FileText size={14} /> Handbuch auswerten
      </Button>
      {offen ? (
        <ActionDialog onClose={() => setOffen(false)} breit>
          <div className="space-y-4 p-5">
            <h3 className="text-base font-semibold">Handbuch per KI auswerten</h3>
            <ManualExtract
              machineId={machineId}
              providers={providers}
              centralKey={centralKey}
            />
            <div className="flex justify-end">
              <DialogAbbrechen>Schließen</DialogAbbrechen>
            </div>
          </div>
        </ActionDialog>
      ) : null}
    </>
  );
}
