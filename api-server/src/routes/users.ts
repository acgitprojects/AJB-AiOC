import { users, passwords } from "../db/seed";
import type { User } from "@ajb/contract";

let nextId = 2;

export const userHandlers = {
  list: async () => ({
    status: 200 as const,
    body: users,
  }),

  create: async ({ body }: { body: { name: string; email: string; password: string; role: "admin" | "user"; alertsEnabled: boolean } }) => {
    const existing = users.find(u => u.email === body.email);
    if (existing) {
      return { status: 400 as const, body: { error: "Email already registered" } };
    }
    const user: User = {
      id: `user-${nextId++}`,
      email: body.email,
      name: body.name,
      role: body.role,
      alertsEnabled: body.alertsEnabled,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    passwords[user.id] = body.password;
    return { status: 201 as const, body: user };
  },

  me: async () => {
    const user = users[0];
    if (!user) return { status: 200 as const, body: { ok: false as const } };
    return { status: 200 as const, body: { ok: true as const, user } };
  },

  update: async ({ params, body }: { params: { id: string }; body: Partial<Omit<User, "id" | "createdAt">> }) => {
    const user = users.find(u => u.id === params.id);
    if (!user) return { status: 404 as const, body: { message: "User not found" } };
    Object.assign(user, body);
    return { status: 200 as const, body: user };
  },

  delete: async ({ params }: { params: { id: string } }) => {
    const idx = users.findIndex(u => u.id === params.id);
    if (idx === -1) return { status: 404 as const, body: { message: "User not found" } };
    users.splice(idx, 1);
    return { status: 200 as const, body: { ok: true } };
  },

  changePassword: async ({ body }: { body: { currentPassword: string; newPassword: string } }) => {
    const user = users[0];
    if (!user) return { status: 200 as const, body: { ok: false, error: "no_user" } };
    if (passwords[user.id] !== body.currentPassword) {
      return { status: 200 as const, body: { ok: false, error: "wrong_current_password" } };
    }
    if (body.newPassword.length < 8) {
      return { status: 200 as const, body: { ok: false, error: "password_too_short" } };
    }
    passwords[user.id] = body.newPassword;
    return { status: 200 as const, body: { ok: true } };
  },

  alerts: async ({ body }: { body: { subject: string; message: string; severity: string } }) => {
    const eligible = users.filter(u => u.alertsEnabled && u.alertEmail);
    // In production this would send emails; here we just count
    void body;
    return { status: 200 as const, body: { ok: true, sent: eligible.length, failed: 0 } };
  },
};
