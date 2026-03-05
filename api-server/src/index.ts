import Fastify from "fastify";
import cors from "@fastify/cors";
import { WebSocketServer } from "ws";
import { initServer } from "@ts-rest/fastify";
import { appRouter } from "./router";
import { migrate } from "./db/migrate";
import { seedIfEmpty, resetAndReseed } from "./db/seed";
import { handleWsChat } from "./routes/ws-chat";

async function start() {
  await migrate();
  await seedIfEmpty();

  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  // ── Test-only reset endpoint ─────────────────────────────────────────────
  // Truncates all tables and re-seeds. Only active when ADMIN_PASSWORD is set.
  // Guarded by Authorization: Bearer <ADMIN_PASSWORD> header.
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword) {
    app.post("/api/test/reset", async (req, reply) => {
      const auth = (req.headers["authorization"] ?? "") as string;
      if (auth !== `Bearer ${adminPassword}`) {
        return reply.status(401).send({ message: "Unauthorized" });
      }
      await resetAndReseed();
      return reply.status(204).send();
    });
  }

  const s = initServer();
  await app.register(s.plugin(appRouter));

  const port = Number(process.env.PORT ?? 3001);
  await app.listen({ port, host: "0.0.0.0" });

  const wss = new WebSocketServer({ noServer: true });
  app.server.on("upgrade", (req, socket, head) => {
    if (req.url === "/api/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => handleWsChat(ws));
    }
  });
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
