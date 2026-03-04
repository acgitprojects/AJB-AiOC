import { z } from "zod";

export const GatewayStatusSchema = z.object({
  connected: z.boolean(),
  gatewayUrl: z.string(),
  viaApiServer: z.boolean(),
  checkedAt: z.string(),
  version: z.string().optional(),
  channels: z.array(z.string()).optional(),
  error: z.string().optional(),
});
export type GatewayStatus = z.infer<typeof GatewayStatusSchema>;

export const ChatBodySchema = z.object({
  message: z.string(),
  agentId: z.string().optional(),
});

export const ChatResponseSchema = z.object({
  ok: z.boolean(),
  reply: z.string().optional(),
  error: z.string().optional(),
});
