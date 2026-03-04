import { briefing } from "../db/in-memory";

export const briefingHandlers = {
  get: async () => {
    return { status: 200 as const, body: briefing };
  },
  trigger: async () => {
    briefing.status = "generating";
    setTimeout(() => {
      briefing.status = "error";
    }, 2000);
    return { status: 200 as const, body: briefing };
  },
};
