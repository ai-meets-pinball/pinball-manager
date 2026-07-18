import { createAuthClient } from "better-auth/react";

/* Browser-Client für Better Auth (same-origin). */
export const authClient = createAuthClient();

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  changePassword,
  changeEmail,
  updateUser,
} = authClient;
