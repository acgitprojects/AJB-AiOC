import { execSync } from "child_process";
import * as path from "path";
import * as crypto from "crypto";

const REPO_ROOT = path.resolve(__dirname, "../..");
const COMPOSE_FILES = [
  "-f", path.join(REPO_ROOT, "docker-compose.yml"),
  "-f", path.join(REPO_ROOT, "docker-compose.test.yml"),
];

export interface ComposeEnv {
  baseUrl: string;
  teardown(): void;
}

export async function startComposeEnv(): Promise<ComposeEnv> {
  // When run_tests.sh manages a shared stack it exports E2E_API_URL.
  // In that case skip spinning up a new stack — teardown is a no-op.
  if (process.env.E2E_API_URL) {
    return {
      baseUrl: process.env.E2E_API_URL,
      teardown: () => {},
    };
  }

  // Fallback: spin up an isolated stack (useful when running a single test
  // file directly without run_tests.sh).
  const project = `e2e-${crypto.randomBytes(4).toString("hex")}`;
  const flags = [...COMPOSE_FILES, "-p", project];
  const cmd = (sub: string) => `docker compose ${flags.join(" ")} ${sub}`;

  execSync(`${cmd("up -d --wait postgres api-server")}`, {
    cwd: REPO_ROOT,
    stdio: "pipe",
  });

  // Discover the randomly-assigned host port
  const portLine = execSync(`${cmd("port api-server 3001")}`, { cwd: REPO_ROOT })
    .toString()
    .trim(); // e.g. "0.0.0.0:54321"
  const port = portLine.split(":").pop()!;

  return {
    baseUrl: `http://localhost:${port}`,
    teardown: () =>
      execSync(`${cmd("down -v --remove-orphans")}`, {
        cwd: REPO_ROOT,
        stdio: "pipe",
      }),
  };
}
