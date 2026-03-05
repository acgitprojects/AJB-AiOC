import { ocWsRequest } from "./api-server/src/lib/openclaw-ws.ts";

async function runTests() {
  console.log("=== Testing OpenClaw WS Methods ===\n");

  const tests = [
    { name: "models.list with no params", method: "models.list", params: {} },
    { name: "models.list with configuredOnly: true", method: "models.list", params: { configuredOnly: true } },
    { name: "models.list with provider filter", method: "models.list", params: { provider: "github-copilot" } },
    { name: "auth.profiles.list", method: "auth.profiles.list", params: {} },
    { name: "config.get", method: "config.get", params: {} },
  ];

  for (const test of tests) {
    try {
      const result = await ocWsRequest(test.method, test.params);
      const resultStr = JSON.stringify(result);
      const preview = resultStr.length > 150 ? resultStr.slice(0, 150) + "..." : resultStr;
      console.log(`✓ ${test.name}:`);
      console.log(`  ${preview}\n`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`✗ ${test.name}: ${msg}\n`);
    }
  }
}

runTests();
