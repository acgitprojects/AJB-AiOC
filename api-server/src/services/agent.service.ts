import { ocWsRequest } from "../lib/openclaw-ws";
import * as configRepo from "../repositories/openclaw-config.repository";
import type { Agent, OcAgent } from "@ajb/contract";

export async function listAgents(): Promise<Agent[]> {
  let ocAgents: OcAgent[] = [];
  try {
    const payload = (await ocWsRequest("agents.list", {})) as { defaultId?: string; agents?: OcAgent[] } | null;
    ocAgents = payload?.agents ?? [];
  } catch {
    // openclaw unreachable — return empty
  }
  const configs = await configRepo.findAll().catch(() => []);
  const configMap = new Map(configs.map(c => [c.agentId, c]));
  return ocAgents.map(a => {
    const cfg = configMap.get(a.id);
    return {
      id: a.id,
      name: a.name ?? a.id,
      role: "",
      model: cfg?.model ?? "",
      status: "offline" as const,
      skills: cfg?.tools ?? [],
      tasksCompleted: 0,
      responseRate: 0,
      avgResponseMs: 0,
      reports: [],
      reportsTo: null,
    };
  });
}
