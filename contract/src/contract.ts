import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { MyTaskSchema, TaskPatchSchema, TaskCreateSchema, TaskListQuerySchema } from "./schemas/task";
import { AgentSchema } from "./schemas/agent";
import { DailyBriefingSchema } from "./schemas/briefing";
import { DashboardStatsSchema } from "./schemas/dashboard";
import {
  LoginBodySchema,
  LoginResponseSchema,
  ForgotPasswordBodySchema,
  ResetPasswordBodySchema,
  ResetPasswordResponseSchema,
  OkResponseSchema,
} from "./schemas/auth";
import {
  GatewayStatusSchema,
  ChatBodySchema,
  ChatResponseSchema,
} from "./schemas/openclaw";
import { KanbanTaskSchema, BoardPatchBodySchema } from "./schemas/board";
import { PipelineItemSchema } from "./schemas/pipeline";
import { CalendarDataSchema } from "./schemas/calendar";
import {
  UserSchema,
  MeResponseSchema,
  CreateUserBodySchema,
  UpdateUserBodySchema,
  ChangePasswordBodySchema,
  ChangePasswordResponseSchema,
  AlertBodySchema,
  AlertResultSchema,
} from "./schemas/users";

const c = initContract();

export const contract = c.router({
  tasks: c.router({
    list: {
      method: "GET",
      path: "/api/tasks",
      query: TaskListQuerySchema,
      responses: { 200: z.array(MyTaskSchema) },
    },
    create: {
      method: "POST",
      path: "/api/tasks",
      body: TaskCreateSchema,
      responses: { 201: MyTaskSchema },
    },
    patch: {
      method: "PATCH",
      path: "/api/tasks/:id",
      pathParams: z.object({ id: z.string() }),
      body: TaskPatchSchema,
      responses: {
        200: MyTaskSchema,
        404: z.object({ message: z.string() }),
      },
    },
  }),

  agents: c.router({
    list: {
      method: "GET",
      path: "/api/agents",
      responses: { 200: z.array(AgentSchema) },
    },
  }),

  dashboard: c.router({
    stats: {
      method: "GET",
      path: "/api/dashboard/stats",
      responses: { 200: DashboardStatsSchema },
    },
  }),

  briefing: c.router({
    get: {
      method: "GET",
      path: "/api/briefing",
      responses: { 200: DailyBriefingSchema },
    },
    trigger: {
      method: "POST",
      path: "/api/briefing",
      body: z.object({}),
      responses: { 200: DailyBriefingSchema },
    },
  }),

  auth: c.router({
    login: {
      method: "POST",
      path: "/api/auth/login",
      body: LoginBodySchema,
      responses: { 200: LoginResponseSchema },
    },
    logout: {
      method: "DELETE",
      path: "/api/auth/logout",
      body: c.noBody(),
      responses: { 200: OkResponseSchema },
    },
    forgotPassword: {
      method: "POST",
      path: "/api/auth/forgot-password",
      body: ForgotPasswordBodySchema,
      responses: { 200: OkResponseSchema },
    },
    resetPassword: {
      method: "POST",
      path: "/api/auth/reset-password",
      body: ResetPasswordBodySchema,
      responses: { 200: ResetPasswordResponseSchema },
    },
  }),

  openclaw: c.router({
    status: {
      method: "GET",
      path: "/api/openclaw/status",
      responses: { 200: GatewayStatusSchema },
    },
    chat: {
      method: "POST",
      path: "/api/chat",
      body: ChatBodySchema,
      responses: {
        200: ChatResponseSchema,
        202: ChatResponseSchema,
      },
    },
  }),

  board: c.router({
    list: {
      method: "GET",
      path: "/api/board",
      responses: { 200: z.array(KanbanTaskSchema) },
    },
    patch: {
      method: "PATCH",
      path: "/api/board",
      body: BoardPatchBodySchema,
      responses: { 200: KanbanTaskSchema },
    },
  }),

  pipeline: c.router({
    list: {
      method: "GET",
      path: "/api/pipeline",
      responses: { 200: z.array(PipelineItemSchema) },
    },
  }),

  calendar: c.router({
    list: {
      method: "GET",
      path: "/api/calendar",
      responses: { 200: CalendarDataSchema },
    },
  }),

  users: c.router({
    list: {
      method: "GET",
      path: "/api/users",
      responses: { 200: z.array(UserSchema) },
    },
    create: {
      method: "POST",
      path: "/api/users",
      body: CreateUserBodySchema,
      responses: {
        201: UserSchema,
        400: z.object({ error: z.string() }),
      },
    },
    me: {
      method: "GET",
      path: "/api/users/me",
      responses: { 200: MeResponseSchema },
    },
    update: {
      method: "PATCH",
      path: "/api/users/:id",
      pathParams: z.object({ id: z.string() }),
      body: UpdateUserBodySchema,
      responses: {
        200: UserSchema,
        404: z.object({ message: z.string() }),
      },
    },
    delete: {
      method: "DELETE",
      path: "/api/users/:id",
      pathParams: z.object({ id: z.string() }),
      body: c.noBody(),
      responses: {
        200: OkResponseSchema,
        404: z.object({ message: z.string() }),
      },
    },
    changePassword: {
      method: "PUT",
      path: "/api/users/me/password",
      body: ChangePasswordBodySchema,
      responses: { 200: ChangePasswordResponseSchema },
    },
    alerts: {
      method: "POST",
      path: "/api/users/alerts",
      body: AlertBodySchema,
      responses: { 200: AlertResultSchema },
    },
  }),
});

export type AppContract = typeof contract;
