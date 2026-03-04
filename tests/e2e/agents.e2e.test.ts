import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startComposeEnv, type ComposeEnv } from "../helpers/compose-env";
import { resetDb } from "../helpers/reset-db";

let env: ComposeEnv;

beforeAll(async () => {
  env = await startComposeEnv();
}, 120_000);

afterAll(() => {
  env.teardown();
});

beforeEach(async () => {
  await resetDb(env.baseUrl);
}, 30_000);

describe("GET /api/agents", () => {
  it("returns 10 seeded agents", async () => {
    const res = await fetch(`${env.baseUrl}/api/agents`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body).toHaveLength(10);
  });

  it("each agent has required fields", async () => {
    const res = await fetch(`${env.baseUrl}/api/agents`);
    const agents = (await res.json()) as Array<Record<string, unknown>>;
    for (const agent of agents) {
      expect(typeof agent.id).toBe("string");
      expect(typeof agent.name).toBe("string");
      expect(typeof agent.role).toBe("string");
      expect(typeof agent.status).toBe("string");
    }
  });

  it("includes jary as root agent", async () => {
    const res = await fetch(`${env.baseUrl}/api/agents`);
    const agents = (await res.json()) as Array<{ id: string; reportsTo: string | null }>;
    const jary = agents.find((a) => a.id === "jary");
    expect(jary).toBeDefined();
    expect(jary!.reportsTo).toBeNull();
  });
});
