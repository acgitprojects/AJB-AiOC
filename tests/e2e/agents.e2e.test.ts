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
  it("returns 200 with array when openclaw unreachable", async () => {
    const res = await fetch(`${env.baseUrl}/api/agents`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns empty array when openclaw is absent", async () => {
    const res = await fetch(`${env.baseUrl}/api/agents`);
    const body = (await res.json()) as unknown[];
    // openclaw not running in test stack → empty
    expect(body).toHaveLength(0);
  });
});
