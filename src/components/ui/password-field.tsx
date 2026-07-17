"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";

/*
  Passwortfeld mit Anzeigen/Verbergen-Umschalter. Kapselt nur die Sichtbarkeit —
  Validierung/Policy liegt in lib/validators.ts (validatePassword), damit Client
  und Server dieselbe Quelle nutzen.
*/
export function PasswordField({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={show ? "text" : "password"}
        className={`pr-10 ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Passwort verbergen" : "Passwort anzeigen"}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
