import { createAuthClient } from "better-auth/react";

/* Browser-Client für Better Auth (same-origin). */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
