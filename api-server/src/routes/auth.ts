import { login, resetPassword, resetTokens } from "../services/user.service";

export const authHandlers = {
  login: async ({ body }: { body: { email?: string; password: string } }) => {
    const result = await login(body.email, body.password);
    return { status: 200 as const, body: result };
  },

  logout: async () => {
    return { status: 200 as const, body: { ok: true } };
  },

  forgotPassword: async () => {
    return { status: 200 as const, body: { ok: true } };
  },

  resetPassword: async ({ body }: { body: { token: string; password: string } }) => {
    const result = await resetPassword(body.token, body.password);
    return { status: 200 as const, body: result };
  },
};
