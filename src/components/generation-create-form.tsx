"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { createGeneration } from "@/db/actions/generations";
import type { FormState } from "@/db/actions/clubs";

/*
  Neue Generation von Hand anlegen (Super-Admin). Zeigt Erfolg/Fehler inline —
  etwa wenn der Name schon existiert (Name ist unique).
*/
export function GenerationCreateForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createGeneration,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          name="name"
          placeholder="Neue Generation, z. B. WPC-95"
          required
          className="max-w-xs"
          aria-label="Name der neuen Generation"
        />
        <Button type="submit" disabled={pending}>
          <Plus size={16} /> Anlegen
        </Button>
      </div>
      <FormFeedback state={state} />
    </form>
  );
}
