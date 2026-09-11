import { expect, test } from "@playwright/test";
import { createAccount, loginAs, USERS } from "./helpers/auth";
import { addKnowledge, createMachine, sql, userIdByEmail } from "./helpers/db";

/*
  Regression: die Sichtbarkeit eines eigenen Wissenseintrags änderte sich auf
  der MODELLSEITE erst nach manuellem Neuladen. Zwei Ursachen, beide hier
  abgedeckt:

  1. Die Action revalidierte nur `/machines/<id>` — die Modellseite reicht aber
     `machineId=""` durch, also wurde dort gar nichts aufgefrischt.
  2. React 19 setzt das Formular nach einer Action automatisch zurück. Bei einem
     GESTEUERTEN Feld stellte der Reset den alten Wert im DOM wieder her, ohne
     dass React nachzog — das Feld zeigte „privat", während gerendert
     „öffentlich" dastand und die DB längst „öffentlich" sagte.
*/
test.describe("Sichtbarkeit eines Wissenseintrags", () => {
  test("Wechsel wirkt sofort im Feld — ohne Neuladen", async ({
    page,
    request,
  }) => {
    await createAccount(request, USERS.admin).catch(() => {});
    const uid = await userIdByEmail(USERS.admin);
    const m = await createMachine({
      ownerId: uid,
      opdbRef: "VISTEST-AAA",
      modell: "Sichtbarkeit Testgerät",
    });
    await addKnowledge({
      modelId: m.modelId,
      createdBy: uid,
      visibility: "privat",
    });

    await loginAs(page, USERS.admin);
    await page.goto(`/modelle/${m.modelId}?bereich=handbuch`);
    const feld = page.locator('select[name="visibility"]');
    await expect(feld).toHaveValue("privat");

    await feld.selectOption("oeffentlich");

    // Der Kern: das Feld darf NICHT zurückspringen, auch nicht nach der
    // Serverantwort und dem Auffrischen der Seite.
    await expect(feld).toHaveValue("oeffentlich");
    await page.waitForTimeout(2000);
    await expect(
      feld,
      "Feld springt nach der Action auf den alten Wert zurück",
    ).toHaveValue("oeffentlich");

    const [k] =
      await sql`SELECT visibility FROM knowledge WHERE model_id = ${m.modelId}`;
    expect(k.visibility, "und der Server hat es auch gespeichert").toBe(
      "oeffentlich",
    );

    await sql`DELETE FROM knowledge WHERE model_id = ${m.modelId}`;
  });
});
