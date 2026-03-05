import { initServer } from "@ts-rest/fastify";
import { contract } from "@ajb/contract";
import { taskHandlers } from "./routes/tasks";
import { taskCommentHandlers } from "./routes/task-comments";
import { taskFileHandlers } from "./routes/task-files";
import { agentHandlers } from "./routes/agents";
import { dashboardHandlers } from "./routes/dashboard";
import { briefingHandlers } from "./routes/briefing";
import { authHandlers } from "./routes/auth";
import { openclawHandlers } from "./routes/openclaw";
import { boardHandlers } from "./routes/board";
import { pipelineHandlers } from "./routes/pipeline";
import { calendarHandlers } from "./routes/calendar";
import { userHandlers } from "./routes/users";
import { documentHandlers } from "./routes/documents";

const s = initServer();

export const appRouter = s.router(contract, {
  tasks: { ...taskHandlers, comments: taskCommentHandlers, files: taskFileHandlers },
  agents: agentHandlers,
  dashboard: dashboardHandlers,
  briefing: briefingHandlers,
  auth: authHandlers,
  openclaw: openclawHandlers,
  board: boardHandlers,
  pipeline: pipelineHandlers,
  calendar: calendarHandlers,
  users: userHandlers,
  documents: documentHandlers,
});
