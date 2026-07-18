"use client";

import { LogOut, ShieldCheck, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/auth-client";

/*
  Nutzer-Menü in der Navigation: bündelt Konto, Administration (nur Super-Admin)
  und Abmelden hinter einem User-Icon, statt sie einzeln in die Kopfzeile zu legen.
  Schließt bei Klick außerhalb, Escape und Navigationswechsel.
*/
export function UserMenu({
  userName,
  isSuperAdmin = false,
}: {
  userName: string;
  isSuperAdmin?: boolean;
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
        className={`flex items-center gap-1.5 rounded-[var(--radius)] px-2.5 py-1.5 text-sm font-medium transition-colors ${
          open ||
          pathname.startsWith("/account") ||
          pathname.startsWith("/admin") ||
          pathname.startsWith("/clubs")
            ? "bg-[var(--color-inset)] text-[var(--color-fg)]"
            : "text-[var(--color-muted)] hover:bg-[var(--color-inset)] hover:text-[var(--color-fg)]"
        }`}
      >
        <User size={15} />
        <span className="hidden max-w-[12ch] truncate font-mono text-xs md:inline">
          {userName}
        </span>
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
        </div>
      ) : null}
    </div>
  );
}
