"use client";

import type { ComponentProps } from "react";
import { Select } from "@/components/ui/input";

/*
  Select, das sein (GET-)Formular bei Änderung sofort abschickt — Filter wirken
  ohne extra Klick. Kleinste Client-Insel; ohne JS greift weiterhin der
  „Suchen"-Button des umgebenden Formulars (SearchToolbar).
*/
export function AutoSubmitSelect(props: ComponentProps<"select">) {
  return (
    <Select
      {...props}
      onChange={(e) => {
        props.onChange?.(e);
        e.currentTarget.form?.requestSubmit();
      }}
    />
  );
}
