"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      aria-label="Abmelden"
      className="inline-flex h-9 items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-3 text-sm transition-colors hover:bg-[var(--color-border)]/40"
    >
      <LogOut size={16} />
      <span className="hidden sm:inline">Abmelden</span>
    </button>
  );
}
