import { calendar } from "../db/seed";

export const calendarHandlers = {
  list: async () => ({
    status: 200 as const,
    body: calendar,
  }),
};
