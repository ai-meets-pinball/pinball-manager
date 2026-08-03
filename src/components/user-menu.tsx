"use client";

import {
  ListChecks,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { signOut } from "@/lib/auth-client";
import { APP_VERSION } from "@/lib/version";

/*
  Nutzer-Menü in der Navigation: bündelt Konto, Administration (nur Super-Admin)
  und Abmelden hinter einem User-Icon, statt sie einzeln in die Kopfzeile zu legen.
  Schließt bei Klick außerhalb, Escape und Navigationswechsel.
*/
export function UserMenu({
  userName,
  avatar,
  kuerzel,
  isSuperAdmin = false,
  istKurator = false,
}: {
  userName: string;
  /** Profilbild-URL (oder null → Initialen). */
  avatar: string | null;
  /** Initialen für den Avatar-Fallback (lib/format.ts initialen()). */
  kuerzel: string;
  isSuperAdmin?: boolean;
  /** Kurator ODER Super-Admin: zeigt den Menüpunkt „Kuratierung". */
  istKurator?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    router.push("/login");
    router.refresh();
  }

  const itemClass =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-fg)] transition-colors hover:bg-[var(--color-inset)]";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Nutzermenü"
        className={`flex items-center rounded-full transition-opacity ${
          open ||
          pathname.startsWith("/account") ||
          pathname.startsWith("/admin") ||
          pathname.startsWith("/kuratierung") ||
          pathname.startsWith("/clubs")
            ? "ring-2 ring-[var(--color-primary)]/40"
            : "hover:opacity-80"
        }`}
      >
        {/* Avatar statt Namens-Text: Bild, sonst Initialen. */}
        <Avatar image={avatar} kuerzel={kuerzel} size={30} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
        >
          <div className="border-b border-[var(--color-border)] px-3 py-2">
            <p className="truncate text-sm font-medium">{userName}</p>
            {isSuperAdmin ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.5px] text-[var(--color-primary)]">
                Super-Admin
              </p>
            ) : null}
          </div>

          <Link
            href="/clubs"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <Users size={15} className="text-[var(--color-muted)]" />
            Clubs
          </Link>

          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <User size={15} className="text-[var(--color-muted)]" />
            Konto
          </Link>

          <Link
            href="/wartungsplaene"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <ListChecks size={15} className="text-[var(--color-muted)]" />
            Wartungspläne
          </Link>

          {istKurator ? (
            <Link
              href="/kuratierung"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <ShieldAlert size={15} className="text-[var(--color-muted)]" />
              Kuratierung
            </Link>
          ) : null}

          {isSuperAdmin ? (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <ShieldCheck size={15} className="text-[var(--color-muted)]" />
              Administration
            </Link>
          ) : null}

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className={`${itemClass} border-t border-[var(--color-border)]`}
          >
            <LogOut size={15} className="text-[var(--color-muted)]" />
            Abmelden
          </button>

          <p className="border-t border-[var(--color-border)] px-3 py-1.5 text-right font-mono text-[10px] text-[var(--color-faint)]">
            Version {APP_VERSION}
          </p>
        </div>
      ) : null}
    </div>
  );
}
