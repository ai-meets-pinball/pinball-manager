import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Einziger eigener Route-Handler der App — alles andere läuft über RSC + Server Actions.
export const { GET, POST } = toNextJsHandler(auth);
