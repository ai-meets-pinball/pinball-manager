import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getKiInDerApp } from "@/db/queries/settings";
import { darfKi } from "@/lib/ki-zugang";
import { getCurrentUser } from "@/lib/session";
import { handbuchToken } from "@/lib/handbuch-speicher";
import {
  HANDBUCH_MAX_BYTES,
  handbuchTmpPraefix,
  pruefeHandbuchPfad,
} from "@/lib/handbuch-tmp";

/*
  Token-Ausgabe für große Handbücher (lib/handbuch-tmp.ts) — wie /api/upload,
  aber für den PRIVATEN Store. Ein Token bekommt nur, wer das Handbuch auch
  auswerten dürfte (darfKi „handbuch"); welche Maschine/welches Modell, prüft
  die Extraktions-Route. Nur PDF, nur in den eigenen Ordner.

  GET: der eigene Ordner (der Browser kennt seine Nutzer-ID nicht).
*/

async function berechtige(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Nicht angemeldet.");
  const ki = darfKi(user, "handbuch", await getKiInDerApp(user.id));
  if (!ki.erlaubt) throw new Error(ki.grund);
  return user.id;
}

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ praefix: handbuchTmpPraefix(await berechtige()) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const antwort = await handleUpload({
      body,
      request,
      token: handbuchToken(),
      onBeforeGenerateToken: async (pathname) => {
        const userId = await berechtige();
        if (!pruefeHandbuchPfad(userId, pathname)) throw new Error("Ungültiger Upload-Pfad.");
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: HANDBUCH_MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(antwort);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
