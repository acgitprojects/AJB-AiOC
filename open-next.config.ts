import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Disable self-reference binding for first-time deployment
  // Re-enable after the worker is successfully created in your Cloudflare account
});

