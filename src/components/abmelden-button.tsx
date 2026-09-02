"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

/*
  „Abmelden" ohne Umweg über das Nutzer-Menü — für Seiten, auf denen das falsche
  Konto eine Sackgasse wäre (Einladung gilt für eine andere E-Mail). Bleibt auf
  der aktuellen URL: nach dem Abmelden zeigt dieselbe Seite die Anmelde-/
  Registrier-Optionen.
*/
export function AbmeldenButton({ children = "Abmelden" }: { children?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await signOut();
        router.refresh();
      }}
    >
      <LogOut size={14} /> {pending ? "…" : children}
    </Button>
  );
}
