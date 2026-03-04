// Frontend tests run inside a Docker container that is part of the compose network.
// run_tests.sh manages the stack lifecycle; this helper simply surfaces the
// pre-configured URLs from environment variables injected by docker-compose.test.yml.

export interface FullComposeEnv {
  baseUrl: string;  // e.g. http://nginx  (internal service name)
  apiUrl: string;   // e.g. http://api-server:3001
  teardown(): void;
}

export async function startFullComposeEnv(): Promise<FullComposeEnv> {
  return {
    baseUrl: process.env.BASE_URL ?? "http://nginx",
    apiUrl: process.env.API_URL ?? "http://api-server:3001",
    teardown: () => {
      // Stack is managed externally by run_tests.sh; nothing to do here.
    },
  };
}
