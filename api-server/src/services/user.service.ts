import * as userRepo from "../repositories/user.repository";
import { hashPassword, verifyPassword } from "./password";
import type { User } from "@ajb/contract";

// In-memory store for short-lived reset tokens (not worth persisting)
export const resetTokens = new Map<string, { userId: string; expiresAt: number }>();

export async function listUsers(): Promise<User[]> {
  return userRepo.findAll();
}

export async function getMe(): Promise<User | null> {
  return userRepo.findFirst();
}

export async function createUser(body: {
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
  alertsEnabled: boolean;
}): Promise<{ user: User } | { error: string }> {
  const existing = await userRepo.findByEmail(body.email);
  if (existing) return { error: "Email already registered" };

  const id = `user-${Date.now()}`;
  const user = await userRepo.create({
    id,
    name: body.name,
    email: body.email,
    role: body.role,
    alertsEnabled: body.alertsEnabled,
  });
  const hash = await hashPassword(body.password);
  await userRepo.setPasswordHash(id, hash);
  return { user };
}

export async function updateUser(
  id: string,
  patch: Partial<Omit<User, "id" | "createdAt">>,
): Promise<User | null> {
  return userRepo.update(id, patch);
}

export async function deleteUser(id: string): Promise<boolean> {
  return userRepo.remove(id);
}

export async function login(
  email: string | undefined,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = email
    ? await userRepo.findByEmail(email)
    : await userRepo.findFirst();

  if (!user) return { ok: false, error: "invalid_credentials" };

  const hash = await userRepo.getPasswordHash(user.id);
  if (!hash) return { ok: false, error: "invalid_credentials" };

  const valid = await verifyPassword(password, hash);
  if (!valid) return { ok: false, error: "invalid_credentials" };

  return { ok: true };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await userRepo.findFirst();
  if (!user) return { ok: false, error: "no_user" };

  const hash = await userRepo.getPasswordHash(user.id);
  if (!hash) return { ok: false, error: "no_user" };

  const valid = await verifyPassword(currentPassword, hash);
  if (!valid) return { ok: false, error: "wrong_current_password" };

  if (newPassword.length < 8) return { ok: false, error: "password_too_short" };

  const newHash = await hashPassword(newPassword);
  await userRepo.setPasswordHash(user.id, newHash);
  return { ok: true };
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  const entry = resetTokens.get(token);
  if (!entry || entry.expiresAt < Date.now()) {
    resetTokens.delete(token);
    return { ok: false, error: "invalid_or_expired_token" };
  }
  const newHash = await hashPassword(newPassword);
  await userRepo.setPasswordHash(entry.userId, newHash);
  resetTokens.delete(token);
  return { ok: true };
}

export async function getUsersEligibleForAlerts(): Promise<User[]> {
  const all = await userRepo.findAll();
  return all.filter((u) => u.alertsEnabled && u.alertEmail);
}
