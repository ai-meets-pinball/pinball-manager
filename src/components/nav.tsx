import Link from "next/link";
import { BookOpen, Users, Wrench } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

/** Kopfzeile der angemeldeten Bereiche. */
export function Nav({ userName }: { userName: string }) {
  return (
    <header className="border-b border-[var(--color-border)]">
      <nav className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-5">
          <Link href="/machines" className="flex items-center gap-2 font-semibold">
            <Wrench size={18} className="text-[var(--color-primary)]" />
            Pinball Manager
          </Link>
          <Link
            href="/machines"
            className="flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          >
            <Wrench size={15} /> Maschinen
          </Link>
          <Link
            href="/clubs"
            className="flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          >
            <Users size={15} /> Clubs
          </Link>
          <Link
            href="/help"
            className="flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          >
            <BookOpen size={15} /> Techstack
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-[var(--color-muted)] sm:inline">
            {userName}
          </span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </nav>
    </header>
  );
}
