import { createSessionHandoffHandlers } from "@/lib/auth-handoff-handlers";

const handlers = createSessionHandoffHandlers();

export const OPTIONS = handlers.OPTIONS;
export const POST = handlers.POST;
