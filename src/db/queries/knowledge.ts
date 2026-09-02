import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  generations,
  knowledge,
  knowledgeOverrides,
  knowledgeRevisions,
  knowledgeSignals,
  knowledgeTargets,
  machineModels,
  user,
} from "@/db/schema";
import { getFamilie } from "@/db/queries/familie";
import { gruppiereNachFamilie } from "@/lib/opdb-ref";
import { darfWissen, kannKuratieren } from "@/lib/rechte";
import {
  getUserClubIds,
  isKurator,
  isSuperAdmin,
  type SessionUser,
} from "@/lib/session";

/*
  Wissensbasis: Sichtbarkeit von Wissenseinträgen und Guides über die drei
  Ebenen (Generation, Modell, Maschine), samt Kuratierungs-Übersicht.
*/

/** Die EINE Sichtbarkeitsregel für `knowledge` (analog shareVisibilityFilter).
    Autor sieht immer eigenes; öffentlich sieht jeder; club nur Clubmitglieder;
    Super-Admin sieht alles (undefined = keine Einschränkung).

    Kuratoren-Moderation: von Kuratoren verborgene Einträge (verborgen_am
    gesetzt) verschwinden für alle — AUSSER für den Autor (sieht sein Eigenes
    immer, markiert samt Begründung), für Kuratoren (sehen alles Geteilte,
    Privates bleibt privat) und für Super-Admins. */
async function knowledgeVisibilityFilter(
  currentUser: SessionUser,
): Promise<SQL | undefined> {
  if (isSuperAdmin(currentUser)) return undefined;
  if (isKurator(currentUser)) {
    return or(
      eq(knowledge.createdBy, currentUser.id),
      ne(knowledge.visibility, "privat"),
    );
  }
  const clubIds = await getUserClubIds(currentUser.id);
  const nichtVerborgen = isNull(knowledge.verborgenAm);
  const parts: (SQL | undefined)[] = [
    // Autor sieht Eigenes IMMER — auch verborgen (wird markiert, nicht versteckt).
    eq(knowledge.createdBy, currentUser.id),
    and(eq(knowledge.visibility, "oeffentlich"), nichtVerborgen),
  ];
  if (clubIds.length > 0) {
    parts.push(
      and(
        eq(knowledge.visibility, "club"),
        inArray(knowledge.clubId, clubIds),
        nichtVerborgen,
      ),
    );
  }
  return or(...parts);
}

/** Autor-/Sichtbarkeits-behaftete Auswahl eines Wissenseintrags — inkl.
    Community-Signalzähler (Phase 5) und dem eigenen Signal des Nutzers. */
function knowledgeAuswahl(userId: string) {
  return {
    id: knowledge.id,
    titel: knowledge.titel,
    inhalt: knowledge.inhalt,
    visibility: knowledge.visibility,
    sourceType: knowledge.sourceType,
    createdAt: knowledge.createdAt,
    autorId: knowledge.createdBy,
    autorName: user.name,
    hilfreich: sql<number>`(select count(*) from ${knowledgeSignals} where ${knowledgeSignals.knowledgeId} = ${knowledge.id} and ${knowledgeSignals.wert} = 'hilfreich')::int`,
    falsch: sql<number>`(select count(*) from ${knowledgeSignals} where ${knowledgeSignals.knowledgeId} = ${knowledge.id} and ${knowledgeSignals.wert} = 'falsch')::int`,
    meinSignal: sql<
      "hilfreich" | "falsch" | null
    >`(select ${knowledgeSignals.wert} from ${knowledgeSignals} where ${knowledgeSignals.knowledgeId} = ${knowledge.id} and ${knowledgeSignals.userId} = ${userId} limit 1)`,
    ausgeblendet: sql<boolean>`exists(select 1 from ${knowledgeOverrides} where ${knowledgeOverrides.knowledgeId} = ${knowledge.id} and ${knowledgeOverrides.userId} = ${userId})`,
    // Kuratoren-Moderation: gesetzt = für alle verborgen. Der Autoren-Join auf
    // `user` ist schon belegt, daher Subselect für den Kuratoren-Namen.
    verborgenAm: knowledge.verborgenAm,
    verborgenGrund: knowledge.verborgenGrund,
    verborgenVonName: sql<
      string | null
    >`(select ${user.name} from ${user} where ${user.id} = ${knowledge.verborgenVon})`,
    // Bearbeitungs-Verlauf: Anzahl gesicherter alter Stände (für „Verlauf (n)").
    revisionen: sql<number>`(select count(*) from ${knowledgeRevisions} where ${knowledgeRevisions.knowledgeId} = ${knowledge.id})::int`,
  } as const;
}

/** Darf dieser Nutzer diesen Wissenseintrag sehen? (Dieselbe Regel wie oben.)
    Server-seitiger Gate für Community-Signale — man signalisiert nur, was man
    auch sehen darf. */
export async function knowledgeSichtbarFuer(
  currentUser: SessionUser,
  knowledgeId: string,
): Promise<boolean> {
  const sichtbar = await knowledgeVisibilityFilter(currentUser);
  const [row] = await db
    .select({ id: knowledge.id })
    .from(knowledge)
    .where(and(eq(knowledge.id, knowledgeId), sichtbar));
  return Boolean(row);
}

/** Sichtbare Handbuch-Fakten (typ='handbuch_fakten') eines Modells — samt
    seiner baugleichen Editionen (Familie): die Spulen-/Schaltermatrix ist dieselbe. */
export async function getModelKnowledge(
  currentUser: SessionUser,
  modelId: string,
) {
  const [sichtbar, familie] = await Promise.all([
    knowledgeVisibilityFilter(currentUser),
    getFamilie(modelId),
  ]);
  return db
    .select(knowledgeAuswahl(currentUser.id))
    .from(knowledge)
    .innerJoin(user, eq(user.id, knowledge.createdBy))
    .where(
      and(
        eq(knowledge.typ, "handbuch_fakten"),
        inArray(knowledge.modelId, familie.ids),
        sichtbar,
      ),
    )
    .orderBy(desc(knowledge.updatedAt));
}

/** Sichtbare Handbuch-Fakten einer Maschine ohne Modell (Maschinen-Ebene). */
export async function getMachineKnowledge(
  currentUser: SessionUser,
  machineId: string,
) {
  const sichtbar = await knowledgeVisibilityFilter(currentUser);
  return db
    .select(knowledgeAuswahl(currentUser.id))
    .from(knowledge)
    .innerJoin(user, eq(user.id, knowledge.createdBy))
    .where(
      and(
        eq(knowledge.typ, "handbuch_fakten"),
        eq(knowledge.machineId, machineId),
        sichtbar,
      ),
    )
    .orderBy(desc(knowledge.updatedAt));
}

/* Wie knowledgeAuswahl, zusätzlich die Generation-Zuordnung eines Eintrags —
   damit ein auf Generation-Ebene angelegter Guide („gilt für WPC-95") kenntlich
   gemacht werden kann. generationName ist null für Modell-/Maschinen-Einträge. */
function guideAuswahl(userId: string) {
  return {
    ...knowledgeAuswahl(userId),
    generationId: knowledge.generationId,
    generationName: generations.name,
  } as const;
}

/**
 * Sichtbare Troubleshooting-Guides eines Modells — inklusive der Guides, die
 * auf der GENERATION dieses Modells liegen (Generation-Resolver): Wissen einer
 * Board-/Hardware-Generation gilt für alle ihre Modelle. Modell-Ebene heißt
 * dabei FAMILIE (baugleiche Editionen, getFamilie) — wie bei den Fakten.
 */
export async function getModelGuides(
  currentUser: SessionUser,
  modelId: string,
) {
  // Familie (baugleiche Editionen) + deren Generation — eine Abfrage.
  const [sichtbar, familie] = await Promise.all([
    knowledgeVisibilityFilter(currentUser),
    getFamilie(modelId),
  ]);
  const ebene = familie.generationId
    ? or(
        inArray(knowledge.modelId, familie.ids),
        eq(knowledge.generationId, familie.generationId),
      )
    : inArray(knowledge.modelId, familie.ids);

  return db
    .select(guideAuswahl(currentUser.id))
    .from(knowledge)
    .innerJoin(user, eq(user.id, knowledge.createdBy))
    .leftJoin(generations, eq(generations.id, knowledge.generationId))
    .where(and(eq(knowledge.typ, "troubleshooting"), ebene, sichtbar))
    .orderBy(desc(knowledge.updatedAt));
}

/** Sichtbare Troubleshooting-Guides einer Maschine ohne Modell (kein
    Generation-Bezug möglich). */
export async function getMachineGuides(
  currentUser: SessionUser,
  machineId: string,
) {
  const sichtbar = await knowledgeVisibilityFilter(currentUser);
  return db
    .select(guideAuswahl(currentUser.id))
    .from(knowledge)
    .innerJoin(user, eq(user.id, knowledge.createdBy))
    .leftJoin(generations, eq(generations.id, knowledge.generationId))
    .where(
      and(
        eq(knowledge.typ, "troubleshooting"),
        eq(knowledge.machineId, machineId),
        sichtbar,
      ),
    )
    .orderBy(desc(knowledge.updatedAt));
}

/*
  Allgemeine Tipps (typ='tipp'): Geltungsbereich liegt n:m in `knowledge_targets`
  (ein Tipp → mehrere Modelle und/oder Generationen). Sichtbar an einem Modell
  ist ein Tipp, wenn eines seiner Ziele das Modell selbst ODER dessen Generation
  ist. Die Ziel-Namen kommen als Arrays mit, damit die Karte „gilt für …" zeigen
  kann.
*/
export async function getModelTipps(currentUser: SessionUser, modelId: string) {
  const [sichtbar, familie] = await Promise.all([
    knowledgeVisibilityFilter(currentUser),
    getFamilie(modelId),
  ]);

  // Ein Tipp trifft, wenn er eine Edition der Familie oder deren Generation zielt.
  const zielTrifft = familie.generationId
    ? or(
        inArray(knowledgeTargets.modelId, familie.ids),
        eq(knowledgeTargets.generationId, familie.generationId),
      )
    : inArray(knowledgeTargets.modelId, familie.ids);

  return db
    .select({
      ...knowledgeAuswahl(currentUser.id),
      zielModelle: sql<
        string[]
      >`(select coalesce(array_agg(${machineModels.modell} order by ${machineModels.modell}), '{}') from ${knowledgeTargets} join ${machineModels} on ${machineModels.id} = ${knowledgeTargets.modelId} where ${knowledgeTargets.knowledgeId} = ${knowledge.id})`,
      zielGenerationen: sql<
        string[]
      >`(select coalesce(array_agg(${generations.name} order by ${generations.name}), '{}') from ${knowledgeTargets} join ${generations} on ${generations.id} = ${knowledgeTargets.generationId} where ${knowledgeTargets.knowledgeId} = ${knowledge.id})`,
    })
    .from(knowledge)
    .innerJoin(user, eq(user.id, knowledge.createdBy))
    .where(
      and(
        eq(knowledge.typ, "tipp"),
        sql`exists(select 1 from ${knowledgeTargets} where ${knowledgeTargets.knowledgeId} = ${knowledge.id} and ${zielTrifft})`,
        sichtbar,
      ),
    )
    .orderBy(desc(knowledge.updatedAt));
}

/** Modell-Katalog für den Ziel-Picker des Tipp-Formulars (Flippermaster) —
    EIN Eintrag je Familie (der editionsneutrale Vertreter), `ids` nennt alle
    Editionen, damit die Maschinen-Seite ihre eigene vorbelegen kann. Gespeichert
    wird das Ziel am Vertreter; gelesen wird familienweit (getModelTipps). */
export async function getTippZielKatalog() {
  // Die beiden Kataloge hängen nicht voneinander ab → parallel laden.
  const [zeilen, generationenListe] = await Promise.all([
    db
      .select({
        id: machineModels.id,
        opdbRef: machineModels.opdbRef,
        hersteller: machineModels.hersteller,
        modell: machineModels.modell,
        baujahr: machineModels.baujahr,
      })
      .from(machineModels)
      .orderBy(machineModels.modell, machineModels.hersteller),
    db
      .select({ id: generations.id, name: generations.name })
      .from(generations)
      .orderBy(generations.name),
  ]);
  const modelle = gruppiereNachFamilie(zeilen).map((f) => ({
    id: f.vertreter.id,
    ids: f.mitglieder.map((m) => m.id),
    hersteller: f.vertreter.hersteller,
    modell: f.vertreter.modell,
    baujahr: f.vertreter.baujahr,
  }));
  return { modelle, generationen: generationenListe };
}

/** Wissensbasis-Katalog: Modelle mit für den Nutzer sichtbarem Wissen —
    gezählt werden ALLE Wissenseinträge (Handbuch-Infos, Guides, …), nicht nur
    Handbuch-Extrakte. */
export async function getKnowledgeModels(currentUser: SessionUser) {
  const sichtbar = await knowledgeVisibilityFilter(currentUser);
  const zeilen = await db
    .select({
      id: machineModels.id,
      opdbRef: machineModels.opdbRef,
      opdbMachineRef: machineModels.opdbMachineRef,
      hersteller: machineModels.hersteller,
      modell: machineModels.modell,
      baujahr: machineModels.baujahr,
      imageUrl: machineModels.imageUrl,
      eintraege: sql<number>`count(*)::int`,
    })
    .from(knowledge)
    .innerJoin(machineModels, eq(machineModels.id, knowledge.modelId))
    .where(sichtbar)
    .groupBy(machineModels.id)
    .orderBy(machineModels.modell, machineModels.hersteller);

  // Die Familie ist eine Katalog-Eigenschaft, kein Wissens-Zufall: auch
  // Editionen OHNE eigene Einträge gehören dazu (Vertreter-Wahl, „auch …").
  const schluessel = [
    ...new Set(zeilen.map((z) => z.opdbMachineRef).filter((s): s is string => s !== null)),
  ];
  const geschwister =
    schluessel.length === 0
      ? []
      : await db
          .select({
            id: machineModels.id,
            opdbRef: machineModels.opdbRef,
            opdbMachineRef: machineModels.opdbMachineRef,
            hersteller: machineModels.hersteller,
            modell: machineModels.modell,
            baujahr: machineModels.baujahr,
            imageUrl: machineModels.imageUrl,
          })
          .from(machineModels)
          .where(inArray(machineModels.opdbMachineRef, schluessel));
  const bekannt = new Set(zeilen.map((z) => z.id));
  const alle = [
    ...zeilen,
    ...geschwister
      .filter((g) => !bekannt.has(g.id))
      .map((g) => ({ ...g, eintraege: 0 })),
  ];

  // Baugleiche Editionen sind EINE Wissensbasis: je Familie ein Eintrag, der
  // Vertreter verlinkt, die Zähler summiert, die anderen Editionen benannt.
  return gruppiereNachFamilie(alle).map((f) => ({
    modelId: f.vertreter.id,
    hersteller: f.vertreter.hersteller,
    modell: f.vertreter.modell,
    baujahr: f.vertreter.baujahr,
    imageUrl: f.vertreter.imageUrl ?? f.mitglieder.find((m) => m.imageUrl)?.imageUrl ?? null,
    eintraege: f.mitglieder.reduce((n, m) => n + m.eintraege, 0),
    editionen: f.mitglieder
      .filter((m) => m.id !== f.vertreter.id)
      .map((m) => m.modell),
  }));
}

/** Verlauf eines Wissenseintrags, neueste Revision zuerst. Das Autor-Gate
    liegt in der Action (loadKnowledgeRevisions) — Verlauf ist nur für den
    Autor bzw. Super-Admin gedacht. */
export async function getKnowledgeRevisions(
  currentUser: SessionUser,
  knowledgeId: string,
) {
  // Das Autor-Gate lag bisher in der Action — ein zweiter Aufrufer hätte den
  // Verlauf still preisgegeben. Jetzt trägt es die Abfrage selbst.
  const [eintrag] = await db
    .select({ createdBy: knowledge.createdBy })
    .from(knowledge)
    .where(eq(knowledge.id, knowledgeId))
    .limit(1);
  if (!eintrag) return [];
  if (!darfWissen(currentUser, eintrag).bearbeiten) {
    throw new Error("Nur der Autor darf den Verlauf sehen");
  }
  return db
    .select({
      id: knowledgeRevisions.id,
      titel: knowledgeRevisions.titel,
      inhalt: knowledgeRevisions.inhalt,
      editedAt: knowledgeRevisions.editedAt,
      kommentar: knowledgeRevisions.kommentar,
      editorName: user.name,
    })
    .from(knowledgeRevisions)
    .innerJoin(user, eq(user.id, knowledgeRevisions.editedBy))
    .where(eq(knowledgeRevisions.knowledgeId, knowledgeId))
    .orderBy(desc(knowledgeRevisions.editedAt));
}

/** Kuratierungs-Übersicht (Seite /kuratierung): gemeldete und verborgene
    GETEILTE Wissenseinträge. Bewusst OHNE persönlichen Sichtbarkeitsfilter —
    Kuratoren moderieren alles Geteilte; Privates taucht hier nie auf.
    Die Rolle wird hier selbst geprüft, nicht beim Aufrufer. */
export async function getKuratierungsUebersicht(currentUser: SessionUser) {
  if (!kannKuratieren(currentUser)) {
    throw new Error("Nur Kuratoren dürfen die Übersicht sehen");
  }
  // Dieselben Zähl-Subselects wie in knowledgeAuswahl.
  const hilfreich = sql<number>`(select count(*) from ${knowledgeSignals} where ${knowledgeSignals.knowledgeId} = ${knowledge.id} and ${knowledgeSignals.wert} = 'hilfreich')::int`;
  const falsch = sql<number>`(select count(*) from ${knowledgeSignals} where ${knowledgeSignals.knowledgeId} = ${knowledge.id} and ${knowledgeSignals.wert} = 'falsch')::int`;

  const auswahl = {
    id: knowledge.id,
    typ: knowledge.typ,
    titel: knowledge.titel,
    visibility: knowledge.visibility,
    autorName: user.name,
    modelId: knowledge.modelId,
    machineId: knowledge.machineId,
    generationName: generations.name,
    // Tipps (typ='tipp') haben keine direkte Ebene — als Linkziel dient das
    // erste Ziel-Modell aus knowledge_targets (null, wenn rein generationsweit).
    // ORDER BY, damit das Linkziel bei mehreren Ziel-Modellen deterministisch ist.
    tippModelId: sql<
      string | null
    >`(select ${knowledgeTargets.modelId} from ${knowledgeTargets} where ${knowledgeTargets.knowledgeId} = ${knowledge.id} and ${knowledgeTargets.modelId} is not null order by ${knowledgeTargets.modelId} limit 1)`,
    hilfreich,
    falsch,
    verborgenAm: knowledge.verborgenAm,
    verborgenGrund: knowledge.verborgenGrund,
    verborgenVonName: sql<
      string | null
    >`(select ${user.name} from ${user} where ${user.id} = ${knowledge.verborgenVon})`,
  } as const;

  // Gemeldet = dieselbe Schwelle wie das KnowledgeGemeldet-Banner (rein
  // anzeigend — verborgen wird nur von Hand, am Eintrag selbst).
  const gemeldet = await db
    .select(auswahl)
    .from(knowledge)
    .innerJoin(user, eq(user.id, knowledge.createdBy))
    .leftJoin(generations, eq(generations.id, knowledge.generationId))
    .where(
      and(
        ne(knowledge.visibility, "privat"),
        isNull(knowledge.verborgenAm),
        sql`${falsch} >= 2 and ${falsch} > ${hilfreich}`,
      ),
    )
    .orderBy(desc(knowledge.updatedAt));

  const verborgen = await db
    .select(auswahl)
    .from(knowledge)
    .innerJoin(user, eq(user.id, knowledge.createdBy))
    .leftJoin(generations, eq(generations.id, knowledge.generationId))
    .where(isNotNull(knowledge.verborgenAm))
    .orderBy(desc(knowledge.verborgenAm));

  return { gemeldet, verborgen };
}
