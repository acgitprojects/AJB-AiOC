import { mock, describe, it, expect, beforeEach } from "bun:test";
import type { MyTask } from "@ajb/contract";

const fixture: MyTask = {
  id: "t1",
  title: "Test task",
  createdByAgent: "jary",
  assignee: { type: "human", id: "andrew", name: "Andrew" },
  priority: "high",
  status: "pending",
  createdAt: "2026-01-01T00:00:00Z",
  tags: [],
};

const newTask: MyTask = {
  id: "t2",
  title: "New task",
  createdByAgent: "jary",
  assignee: { type: "human", id: "andrew", name: "Andrew" },
  priority: "medium",
  status: "pending",
  createdAt: "2026-03-05T00:00:00Z",
  tags: [],
};

const mockFindAll = mock(() => Promise.resolve([fixture]));
const mockFindById = mock((id: string) =>
  Promise.resolve(id === "t1" ? fixture : null),
);
const mockUpdate = mock((_id: string, patch: object) =>
  Promise.resolve({ ...fixture, ...patch }),
);
const mockInsert = mock(() => Promise.resolve(newTask));

mock.module("../../src/repositories/task.repository", () => ({
  findAll: mockFindAll,
  findById: mockFindById,
  update: mockUpdate,
  insert: mockInsert,
}));

import { listTasks, patchTask, createTask } from "../../src/services/task.service";

describe("task.service", () => {
  beforeEach(() => {
    mockFindAll.mockClear();
    mockFindById.mockClear();
    mockUpdate.mockClear();
    mockInsert.mockClear();
  });

  it("listTasks returns all tasks", async () => {
    const result = await listTasks();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t1");
    expect(mockFindAll).toHaveBeenCalledTimes(1);
  });

  it("patchTask returns null for unknown id", async () => {
    const result = await patchTask("unknown", { status: "done" });
    expect(result).toBeNull();
    expect(mockFindById).toHaveBeenCalledWith("unknown");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("patchTask delegates to repository update", async () => {
    const result = await patchTask("t1", { status: "done" });
    expect(result).not.toBeNull();
    expect(result?.status).toBe("done");
    expect(mockFindById).toHaveBeenCalledWith("t1");
    expect(mockUpdate).toHaveBeenCalledWith("t1", { status: "done" });
  });

  it("patchTask patches priority", async () => {
    const result = await patchTask("t1", { priority: "low" });
    expect(result?.priority).toBe("low");
  });

  it("createTask delegates to repository insert", async () => {
    const data = {
      title: "New task",
      createdByAgent: "jary",
      assignee: { type: "human" as const, id: "andrew", name: "Andrew" },
      priority: "medium" as const,
      status: "pending" as const,
      tags: [],
    };
    const result = await createTask(data);
    expect(result.id).toBe("t2");
    expect(result.title).toBe("New task");
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith(data);
  });
});
