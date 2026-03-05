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

export const OcAgentSchema = z.object({
  id: z.string(),
  workspace: z.string().optional(),
  agentDir: z.string().optional(),
  bindings: z.number().optional(),
  isDefault: z.boolean().optional(),
  routes: z.array(z.string()).optional(),
  name: z.string().optional(),
  emoji: z.string().optional(),
  model: z.string().optional(),
  tools: z.array(z.string()).optional(),
});
export type OcAgent = z.infer<typeof OcAgentSchema>;

export const OcAgentCreateSchema = z.object({
  id: z.string(),
  model: z.string().optional(),
});

export const OcAgentFileSchema = z.object({
  name: z.string(),
  content: z.string(),
  missing: z.boolean(),
});
export type OcAgentFile = z.infer<typeof OcAgentFileSchema>;

export const OcAgentPatchSchema = z.object({
  files: z.record(z.string(), z.string()).optional(),
  name: z.string().optional(),
  emoji: z.string().optional(),
  model: z.string().optional(),
  tools: z.array(z.string()).optional(),
});

export const OcModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string().optional(),
  contextWindow: z.number().optional(),
  reasoning: z.boolean().optional(),
});
export type OcModel = z.infer<typeof OcModelSchema>;
