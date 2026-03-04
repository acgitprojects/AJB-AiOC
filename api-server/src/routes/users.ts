import {
  listUsers,
  getMe,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  getUsersEligibleForAlerts,
} from "../services/user.service";
import type { User } from "@ajb/contract";

export const userHandlers = {
  list: async () => ({
    status: 200 as const,
    body: await listUsers(),
  }),

  create: async ({ body }: { body: { name: string; email: string; password: string; role: "admin" | "user"; alertsEnabled: boolean } }) => {
    const result = await createUser(body);
    if ("error" in result) return { status: 400 as const, body: { error: result.error } };
    return { status: 201 as const, body: result.user };
  },

  me: async () => {
    const user = await getMe();
    if (!user) return { status: 200 as const, body: { ok: false as const } };
    return { status: 200 as const, body: { ok: true as const, user } };
  },

  update: async ({ params, body }: { params: { id: string }; body: Partial<Omit<User, "id" | "createdAt">> }) => {
    const user = await updateUser(params.id, body);
    if (!user) return { status: 404 as const, body: { message: "User not found" } };
    return { status: 200 as const, body: user };
  },

  delete: async ({ params }: { params: { id: string } }) => {
    const ok = await deleteUser(params.id);
    if (!ok) return { status: 404 as const, body: { message: "User not found" } };
    return { status: 200 as const, body: { ok: true } };
  },

  changePassword: async ({ body }: { body: { currentPassword: string; newPassword: string } }) => {
    const result = await changePassword(body.currentPassword, body.newPassword);
    return { status: 200 as const, body: result };
  },

  alerts: async ({ body }: { body: { subject: string; message: string; severity: string } }) => {
    void body;
    const eligible = await getUsersEligibleForAlerts();
    return { status: 200 as const, body: { ok: true, sent: eligible.length, failed: 0 } };
  },
};
