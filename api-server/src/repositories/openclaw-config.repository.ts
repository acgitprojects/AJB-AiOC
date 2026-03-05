import { sql } from "../db/client";

export type OcConfig = { agentId: string; model: string; tools: string[] };

export async function findAll(): Promise<OcConfig[]> {
  const rows = await sql<{ agent_id: string; model: string; tools: string[] }[]>`
    SELECT agent_id, model, tools FROM openclaw_agent_config
  `;
  return rows.map(r => ({ agentId: r.agent_id, model: r.model, tools: r.tools }));
}

export async function upsert(agentId: string, model?: string, tools?: string[]): Promise<void> {
  const toolsVal = tools ?? [];
  await sql`
    INSERT INTO openclaw_agent_config (agent_id, model, tools)
    VALUES (${agentId}, ${model ?? ''}, ${toolsVal})
    ON CONFLICT (agent_id) DO UPDATE
      SET model = COALESCE(EXCLUDED.model, openclaw_agent_config.model),
          tools = COALESCE(EXCLUDED.tools, openclaw_agent_config.tools)
  `;
}

export async function remove(agentId: string): Promise<void> {
  await sql`DELETE FROM openclaw_agent_config WHERE agent_id = ${agentId}`;
}
