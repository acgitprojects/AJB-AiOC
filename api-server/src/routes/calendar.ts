import { calendar } from "../db/in-memory";

export const calendarHandlers = {
  list: async () => ({
    status: 200 as const,
    body: calendar,
  }),
};
