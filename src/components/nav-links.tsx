import {
  BookOpen,
  Boxes,
  CalendarClock,
  LayoutDashboard,
  Wrench,
} from "lucide-react";

/* Die Hauptziele — EINE Quelle für die Topbar (Desktop) UND die Bottom-Tab-Bar
   (Mobil), damit beide synchron bleiben. */
export const NAV_LINKS = [
  { href: "/dashboard", label: "Übersicht", icon: LayoutDashboard },
  { href: "/machines", label: "Maschinen", icon: Wrench },
  { href: "/termine", label: "Termine", icon: CalendarClock },
  { href: "/modelle", label: "Wissensbasis", icon: Boxes },
  { href: "/help", label: "Hilfe", icon: BookOpen },
] as const;
