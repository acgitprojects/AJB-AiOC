import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { resetDb } from "../helpers/reset-db";
import { startComposeEnv, type ComposeEnv } from "../helpers/compose-env";

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


describe("GET /api/dashboard/stats", () => {
  it("returns stats object with correct shape", async () => {
    const res = await fetch(`${env.baseUrl}/api/dashboard/stats`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(typeof body.tasksToday).toBe("number");
    expect(typeof body.activeAgents).toBe("number");
    expect(typeof body.avgResponseSec).toBe("number");
    expect(typeof body.ajcSubscribers).toBe("number");
  });

  it("tasksToday is non-negative", async () => {
    const res = await fetch(`${env.baseUrl}/api/dashboard/stats`);
    const body = (await res.json()) as { tasksToday: number };
    expect(body.tasksToday).toBeGreaterThanOrEqual(0);
  });

  it("tasksToday reflects non-done seeded tasks", async () => {
    const res = await fetch(`${env.baseUrl}/api/dashboard/stats`);
    const body = (await res.json()) as { tasksToday: number };
    // Seed has 12 tasks; 2 are "done" → 10 non-done
    expect(body.tasksToday).toBe(10);
  });

  it("ajcSubscribers is 34 (hardcoded in seed)", async () => {
    const res = await fetch(`${env.baseUrl}/api/dashboard/stats`);
    const body = (await res.json()) as { ajcSubscribers: number };
    expect(body.ajcSubscribers).toBe(34);
  });
});
