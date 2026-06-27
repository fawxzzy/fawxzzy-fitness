import { proxyDiscordOsMessageCommandPoll } from "@/lib/discord/discordos-message-command-poll-proxy.ts";

export async function GET(request: Request) {
  return proxyDiscordOsMessageCommandPoll(request);
}
