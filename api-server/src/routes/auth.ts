import { passwords, resetTokens, users } from "../db/seed";

export const authHandlers = {
  login: async ({ body }: { body: { email?: string; password: string } }) => {
    const user = users[0];
    const expected = passwords[user.id];
    if (body.password !== expected) {
      return { status: 200 as const, body: { ok: false, error: "invalid_credentials" } };
    }
    return { status: 200 as const, body: { ok: true } };
  },
  logout: async () => {
    return { status: 200 as const, body: { ok: true } };
  },
  forgotPassword: async () => {
    return { status: 200 as const, body: { ok: true } };
  },
  resetPassword: async ({ body }: { body: { token: string; password: string } }) => {
    const entry = resetTokens.get(body.token);
    if (!entry || entry.expiresAt < Date.now()) {
      resetTokens.delete(body.token);
      return { status: 200 as const, body: { ok: false, error: "invalid_or_expired_token" } };
    }
    passwords[entry.userId] = body.password;
    resetTokens.delete(body.token);
    return { status: 200 as const, body: { ok: true } };
  },
};
