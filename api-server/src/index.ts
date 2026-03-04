import Fastify from "fastify";
import cors from "@fastify/cors";
import { initServer } from "@ts-rest/fastify";
import { appRouter } from "./router";

async function start() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  const s = initServer();
  await app.register(s.plugin(appRouter));

  const port = Number(process.env.PORT ?? 3001);
  await app.listen({ port, host: "0.0.0.0" });
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
