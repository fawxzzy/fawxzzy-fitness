import { createSessionSyncHandlers } from "@/lib/auth-handoff-handlers";

const handlers = createSessionSyncHandlers();

export const POST = handlers.POST;
export const DELETE = handlers.DELETE;
export const OPTIONS = handlers.OPTIONS;
