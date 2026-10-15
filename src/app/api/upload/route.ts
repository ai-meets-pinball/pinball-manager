import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getMachineByQrToken, getSammlungByToken } from "@/db/queries";
import { getCurrentUser, requireMachineWrite } from "@/lib/session";
import {
  istUploadZweck,
  pruefeUploadPfad,
  uploadPraefix,
  UPLOAD_ZWECKE,
  type UploadZweck,
} from "@/lib/upload-zweck";

/*
  Token-Ausgabe für Direkt-Uploads in den Blob-Speicher (lib/upload-zweck.ts).
  Der Browser ruft das über `upload()` aus @vercel/blob/client auf und schickt
  in `clientPayload` den Zweck und — wo nötig — den Kontext. Ein Token gibt es
  nur, wer auch speichern dürfte — dieselben Regeln wie in den Aktionen:

  - fehlerfoto: App → Schreibrecht an der Maschine; Geräte-QR → gültiger Code;
    Sammel-QR → gültiger Code UND die Maschine gehört zur Sammlung. Gäste
    erlaubt (nur hier), sie laden unter dem Segment „gast".
  - maschinenfoto: angemeldet; beim Bearbeiten zusätzlich Schreibrecht.
  - dokument: Schreibrecht an der Maschine.
  - avatar, feedback: angemeldet.

  Das Token begrenzt Typen und Größe je Zweck. Die echte Prüfung der Bytes
  passiert beim Speichern (lib/storage.ts uebernehmeUploads).
*/
const CODE_RE = /^[0-9a-f]{8,32}$/i;

type Payload = {
  zweck: UploadZweck;
  machineId?: string;
  token?: string;
  code?: string;
};

function leseNutzlast(roh: string | null): Payload {
  const p = JSON.parse(roh ?? "{}") as Record<string, unknown>;
  if (!istUploadZweck(p.zweck)) throw new Error("Unbekannter Upload-Zweck.");
  const text = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : undefined);
  return { zweck: p.zweck, machineId: text("machineId"), token: text("token"), code: text("code") };
}

/** Prüft die Berechtigung und liefert das Uploader-Segment (Nutzer-ID/„gast"). */
async function berechtige(p: Payload): Promise<string> {
  const user = await getCurrentUser();

  if (p.zweck === "fehlerfoto") {
    if (p.token !== undefined) {
      if (!CODE_RE.test(p.token) || !(await getMachineByQrToken(p.token))) {
        throw new Error("Ungültiger QR-Code.");
      }
      return user?.id ?? "gast";
    }
    if (p.code !== undefined) {
      if (!CODE_RE.test(p.code)) throw new Error("Ungültiger QR-Code.");
      const sammlung = await getSammlungByToken(p.code);
      if (!sammlung?.maschinen.some((m) => m.id === p.machineId)) {
        throw new Error("Ungültiger QR-Code.");
      }
      return user?.id ?? "gast";
    }
  }

  if (!user) throw new Error("Nicht angemeldet.");
  if (p.zweck === "fehlerfoto" || p.zweck === "dokument") {
    if (!p.machineId) throw new Error("Maschine fehlt.");
    await requireMachineWrite(p.machineId);
  }
  if (p.zweck === "maschinenfoto" && p.machineId) {
    await requireMachineWrite(p.machineId);
  }
  return user.id;
}

/*
  GET: welcher Ordner gilt für mich? Der Browser kennt seine Nutzer-ID (bzw.
  „gast") nicht, braucht aber den vollen Pfad für upload(). Dieselbe
  Berechtigungsprüfung wie beim Token — wer hier nichts bekommt, bekommt auch
  kein Token. Query-Parameter = die Felder der Nutzlast.
*/
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const q = new URL(request.url).searchParams;
    const p = leseNutzlast(JSON.stringify(Object.fromEntries(q)));
    const uploader = await berechtige(p);
    return NextResponse.json({ praefix: uploadPraefix(p.zweck, uploader) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const antwort = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const p = leseNutzlast(clientPayload);
        const uploader = await berechtige(p);
        if (!pruefeUploadPfad(p.zweck, uploader, pathname)) {
          throw new Error("Ungültiger Upload-Pfad.");
        }
        const regel = UPLOAD_ZWECKE[p.zweck];
        return {
          allowedContentTypes: [...regel.typen],
          maximumSizeInBytes: regel.maxBytes,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(antwort);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
