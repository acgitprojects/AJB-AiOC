import * as agentRepo from "../repositories/agent.repository";
import type { Agent } from "@ajb/contract";

export async function listAgents(): Promise<Agent[]> {
  return agentRepo.findAll();
}
