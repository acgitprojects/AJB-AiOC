import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(["admin", "user"]),
  alertsEnabled: z.boolean(),
  alertEmail: z.string().optional(),
  createdAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const MeResponseSchema = z.object({
  ok: z.boolean(),
  user: UserSchema.optional(),
});

export const CreateUserBodySchema = z.object({
  name: z.string(),
  email: z.string(),
  password: z.string(),
  role: z.enum(["admin", "user"]),
  alertsEnabled: z.boolean(),
});

export const UpdateUserBodySchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  role: z.enum(["admin", "user"]).optional(),
  alertsEnabled: z.boolean().optional(),
  alertEmail: z.string().optional(),
});

export const ChangePasswordBodySchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string(),
});

export const ChangePasswordResponseSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
});

export const AlertBodySchema = z.object({
  subject: z.string(),
  message: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
});

export const AlertResultSchema = z.object({
  ok: z.boolean(),
  sent: z.number(),
  failed: z.number(),
});
