"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Users, Wrench } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/machines", label: "Maschinen", icon: Wrench },
  { href: "/clubs", label: "Clubs", icon: Users },
  { href: "/help", label: "Techstack", icon: BookOpen },
];

/** Kopfzeile der angemeldeten Bereiche (Arcade-Theme). */
export function Nav({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-5">
          <Link href="/machines" className="flex items-center">
            <span className="font-display text-base tracking-[0.5px]">
              pinball<span className="text-[var(--color-primary)]">-manager</span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[var(--color-overlay)] text-[var(--color-primary-soft)]"
                      : "text-[var(--color-muted)] hover:bg-[var(--color-overlay)] hover:text-[var(--color-fg)]"
                  }`}
                >
                  <Icon size={15} /> {label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-xs text-[var(--color-faint)] sm:inline">
            {userName}
          </span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </nav>
    </header>
  );
}
