import { Field, Select } from "@/components/ui/input";

/*
  Sichtbarkeit für neu erzeugte Handbuch-Fakten (Wissenseintrag). Submittet
  `visibility`; die Route/Action liest es (Default 'privat'). „club" folgt mit
  dem Club-Picker (Phase 5) — hier vorerst privat/öffentlich. Jederzeit später
  am Eintrag änderbar.
*/
export function VisibilityField({
  defaultValue = "privat",
}: {
  defaultValue?: "privat" | "oeffentlich";
}) {
  return (
    <Field
      label="Sichtbarkeit"
      hint="Wer diese Handbuch-Daten sehen darf — später jederzeit änderbar."
    >
      <Select name="visibility" defaultValue={defaultValue}>
        <option value="privat">privat — nur du</option>
        <option value="oeffentlich">
          öffentlich — alle angemeldeten Nutzer
        </option>
      </Select>
    </Field>
  );
}
