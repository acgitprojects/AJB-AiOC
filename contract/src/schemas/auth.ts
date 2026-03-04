import { z } from "zod";

export const LoginBodySchema = z.object({
  email: z.string().optional(),
  password: z.string(),
});

export const LoginResponseSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
});

export const ForgotPasswordBodySchema = z.object({
  email: z.string(),
});

export const ResetPasswordBodySchema = z.object({
  token: z.string(),
  password: z.string(),
});

export const ResetPasswordResponseSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
});

export const OkResponseSchema = z.object({ ok: z.boolean() });
