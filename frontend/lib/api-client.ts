import { initClient } from "@ts-rest/core";
import { contract } from "@ajb/contract";

/**
 * Type-safe API client bound to the shared contract.
 * baseUrl is empty so requests go to the same origin (nginx proxies /api/ to api-server).
 * Override with NEXT_PUBLIC_API_URL for direct API server access in dev.
 */
export const apiClient = initClient(contract, {
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
  baseHeaders: {},
});
