/**
 * lib/agent-health.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Agent health monitoring and liveness detection
 *
 * Strategy:
 *   - Each agent sends heartbeat every 30 seconds (via POST /api/agents/[id]/heartbeat)
 *   - Background job checks every agent's last heartbeat timestamp
 *   - If heartbeat > 2 minutes: mark as "offline"
 *   - If heartbeat > 5 minutes: alert (agent may have crashed)
 *
 * Health states:
 *   - online:    heartbeat within last 2 minutes
 *   - offline:   heartbeat 2-5 minutes ago
 *   - crashed:   heartbeat > 5 minutes ago
 *
 * KV key design:
 *   agent:{agentId}                    → Agent metadata (includes lastHeartbeat)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getAgent, updateAgent } from "@/lib/agent-store";
import { logAudit } from "@/lib/audit-log";

export type AgentHealthStatus = "online" | "offline" | "crashed";

export interface AgentHealth {
  agentId: string;
  status: AgentHealthStatus;
  lastHeartbeat: number; // timestamp
  secondsSinceHeartbeat: number;
  alertLevel: "ok" | "warning" | "critical";
}

const OFFLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
const CRASHED_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check health of a single agent
 */
export async function checkAgentHealth(agentId: string): Promise<AgentHealth> {
  const agent = await getAgent(agentId);

  if (!agent) {
    return {
      agentId,
      status: "crashed",
      lastHeartbeat: 0,
      secondsSinceHeartbeat: Number.POSITIVE_INFINITY,
      alertLevel: "critical",
    };
  }

  const now = Date.now();
  const lastHeartbeat = agent.lastHeartbeat || 0;
  const timeSinceHeartbeat = now - lastHeartbeat;
  const secondsSinceHeartbeat = Math.round(timeSinceHeartbeat / 1000);

  let status: AgentHealthStatus = "online";
  let alertLevel: "ok" | "warning" | "critical" = "ok";

  if (timeSinceHeartbeat > CRASHED_THRESHOLD_MS) {
    status = "crashed";
    alertLevel = "critical";
  } else if (timeSinceHeartbeat > OFFLINE_THRESHOLD_MS) {
    status = "offline";
    alertLevel = "warning";
  }

  // Update agent status in store if changed
  if (agent.status !== status) {
    try {
      await updateAgent(agentId, {
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[agent-health] Failed to update agent ${agentId} status:`, err);
    }
  }

  return {
    agentId,
    status,
    lastHeartbeat,
    secondsSinceHeartbeat,
    alertLevel,
  };
}

/**
 * Check health of all agents
 * Returns map of agentId -> AgentHealth
 */
export async function checkAllAgentHealth(): Promise<Map<string, AgentHealth>> {
  const { getAllAgents } = await import("@/lib/agent-store");
  const agents = await getAllAgents();

  const healthMap = new Map<string, AgentHealth>();

  for (const agent of agents) {
    const health = await checkAgentHealth(agent.id);
    healthMap.set(agent.id, health);
  }

  return healthMap;
}

/**
 * Get agents with critical health issues
 */
export async function getCriticalAgents(): Promise<AgentHealth[]> {
  const healthMap = await checkAllAgentHealth();
  return Array.from(healthMap.values()).filter(h => h.alertLevel === "critical");
}

/**
 * Get agents with warnings
 */
export async function getWarningAgents(): Promise<AgentHealth[]> {
  const healthMap = await checkAllAgentHealth();
  return Array.from(healthMap.values()).filter(h => h.alertLevel === "warning");
}

/**
 * Record heartbeat for an agent
 * Called by agent at /api/agents/[id]/heartbeat
 */
export async function recordHeartbeat(agentId: string): Promise<void> {
  const agent = await getAgent(agentId);

  if (!agent) {
    console.warn(`[agent-health] Heartbeat from unknown agent: ${agentId}`);
    return;
  }

  const now = new Date().toISOString();

  try {
    await updateAgent(agentId, {
      lastHeartbeat: Date.now(),
      status: "online",
      updatedAt: now,
    });
  } catch (err) {
    console.error(`[agent-health] Failed to record heartbeat for ${agentId}:`, err);
  }
}

/**
 * Background job to monitor agent health
 * Should be called periodically (e.g., every 30 seconds)
 */
let healthCheckInterval: NodeJS.Timeout | null = null;

export async function startHealthCheckLoop(intervalMs: number = 30000): Promise<void> {
  if (healthCheckInterval) {
    console.warn("[agent-health] Health check loop already running");
    return;
  }

  healthCheckInterval = setInterval(async () => {
    try {
      const criticalAgents = await getCriticalAgents();
      const warningAgents = await getWarningAgents();

      if (criticalAgents.length > 0) {
        console.error(
          `[agent-health] CRITICAL: ${criticalAgents.length} agents offline (>5 min):`,
          criticalAgents.map(a => `${a.agentId} (${a.secondsSinceHeartbeat}s)`).join(", ")
        );

        // Log audit event for critical conditions
        for (const agent of criticalAgents) {
          await logAudit({
            timestamp: new Date().toISOString(),
            userEmail: "system",
            action: "agent_health_critical",
            resource: "agent",
            resourceId: agent.agentId,
            details: {
              status: agent.status,
              secondsSinceHeartbeat: agent.secondsSinceHeartbeat,
            },
            status: "success",
          });
        }
      }

      if (warningAgents.length > 0) {
        console.warn(
          `[agent-health] WARNING: ${warningAgents.length} agents offline (2-5 min):`,
          warningAgents.map(a => `${a.agentId} (${a.secondsSinceHeartbeat}s)`).join(", ")
        );
      }
    } catch (err) {
      console.error("[agent-health] Error in health check loop:", err);
    }
  }, intervalMs);

  console.log(`[agent-health] Health check loop started (interval: ${intervalMs}ms)`);
}

/**
 * Stop background health check loop
 */
export function stopHealthCheckLoop(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    console.log("[agent-health] Health check loop stopped");
  }
}
