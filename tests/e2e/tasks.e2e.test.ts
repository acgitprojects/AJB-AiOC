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


describe("GET /api/tasks", () => {
  it("returns 12 seeded tasks", async () => {
    const res = await fetch(`${env.baseUrl}/api/tasks`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body).toHaveLength(12);
  });

  it("each task has required fields", async () => {
    const res = await fetch(`${env.baseUrl}/api/tasks`);
    const tasks = (await res.json()) as Array<Record<string, unknown>>;
    for (const task of tasks) {
      expect(typeof task.id).toBe("string");
      expect(typeof task.title).toBe("string");
      expect(typeof task.status).toBe("string");
      expect(typeof task.priority).toBe("string");
    }
  });
});

describe("POST /api/tasks", () => {
  it("creates a new task and returns 201", async () => {
    const res = await fetch(`${env.baseUrl}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "E2E created task",
        createdByAgent: "jary",
        assignee: { type: "human", id: "andrew", name: "Andrew" },
        priority: "high",
        status: "pending",
        tags: ["e2e", "test"],
      }),
    });
    expect(res.status).toBe(201);
    const task = (await res.json()) as Record<string, unknown>;
    expect(typeof task.id).toBe("string");
    expect(task.title).toBe("E2E created task");
    expect(task.priority).toBe("high");
    expect(task.status).toBe("pending");
    expect(task.tags).toEqual(["e2e", "test"]);
  });

  it("new task appears in GET /api/tasks list", async () => {
    await fetch(`${env.baseUrl}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Listed task",
        createdByAgent: "jary",
        assignee: { type: "human", id: "andrew", name: "Andrew" },
        priority: "low",
        status: "pending",
        tags: [],
      }),
    });
    const listRes = await fetch(`${env.baseUrl}/api/tasks`);
    const tasks = (await listRes.json()) as Array<Record<string, unknown>>;
    const found = tasks.find((t) => t.title === "Listed task");
    expect(found).toBeDefined();
  });

  it("returns 400 for missing title", async () => {
    const res = await fetch(`${env.baseUrl}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        createdByAgent: "jary",
        assignee: { type: "human", id: "andrew", name: "Andrew" },
        priority: "medium",
        status: "pending",
        tags: [],
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/tasks/:id", () => {
  it("patches task status", async () => {
    const listRes = await fetch(`${env.baseUrl}/api/tasks`);
    const tasks = (await listRes.json()) as Array<{ id: string; status: string }>;
    const target = tasks.find((t) => t.status === "pending")!;

    const res = await fetch(`${env.baseUrl}/api/tasks/${target.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    expect(res.status).toBe(200);
    const updated = (await res.json()) as { status: string };
    expect(updated.status).toBe("done");
  });

  it("patches task priority", async () => {
    const listRes = await fetch(`${env.baseUrl}/api/tasks`);
    const tasks = (await listRes.json()) as Array<{ id: string; priority: string }>;
    const target = tasks.find((t) => t.priority === "low")!;

    const res = await fetch(`${env.baseUrl}/api/tasks/${target.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: "high" }),
    });
    expect(res.status).toBe(200);
    const updated = (await res.json()) as { priority: string };
    expect(updated.priority).toBe("high");
  });

  it("returns 404 for unknown task id", async () => {
    const res = await fetch(`${env.baseUrl}/api/tasks/nonexistent-id`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    expect(res.status).toBe(404);
  });
});
