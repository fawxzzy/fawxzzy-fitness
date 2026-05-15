import { randomUUID } from "node:crypto";
import {
  DISCORD_APPLICATION_ID,
  DISCORD_GUILD_ID,
  DISCORD_UNVERIFIED_ROLE_ID,
  DISCORD_VERIFY_CHANNEL_ID,
  DISCORD_VERIFY_MESSAGE_BODY,
  DISCORD_VERIFY_MESSAGE_TITLE,
  DISCORD_VERIFIED_ROLE_ID,
} from "@/lib/env";
import { verifyDiscordInteractionSignature } from "@/lib/discord/interaction-signature";
import {
  buildDiscordEphemeralMessageResponse,
  buildDiscordPongResponse,
  buildDiscordVerifyMessagePayload,
  buildDiscordVerifyModalResponse,
  discordMemberHasSetupPermission,
  discordMessageHasVerifyButton,
  DISCORD_INTERACTION_TYPE,
  FITNESS_VERIFY_BUTTON_CUSTOM_ID,
  FITNESS_VERIFY_COMMAND_NAME,
  FITNESS_VERIFY_MODAL_CUSTOM_ID,
  extractDiscordModalTextInputValue,
} from "@/lib/discord/interactions";
import {
  addDiscordGuildMemberRole,
  createDiscordChannelMessage,
  fetchDiscordChannelMessages,
  patchDiscordChannelMessage,
  removeDiscordGuildMemberRole,
} from "@/lib/discord/rest";
import { consumeDiscordVerificationTokenForDiscordUser } from "@/lib/discord/verification-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
};

type DiscordInteraction = {
  type?: unknown;
  guild_id?: unknown;
  member?: {
    permissions?: unknown;
    user?: {
      id?: unknown;
      username?: unknown;
      global_name?: unknown;
    };
  } | null;
  user?: {
    id?: unknown;
    username?: unknown;
    global_name?: unknown;
  } | null;
  data?: {
    name?: unknown;
    custom_id?: unknown;
    components?: unknown;
  } | null;
};

function jsonResponse(body: Record<string, unknown>, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

function resolveDiscordInteractionUser(interaction: DiscordInteraction): {
  id: string | null;
  username: string | null;
} {
  const memberUser = interaction.member?.user;
  const directUser = interaction.user;
  const idCandidate = memberUser?.id ?? directUser?.id;
  const usernameCandidate = memberUser?.username ?? directUser?.username ?? memberUser?.global_name ?? directUser?.global_name;

  return {
    id: typeof idCandidate === "string" ? idCandidate : null,
    username: typeof usernameCandidate === "string" ? usernameCandidate : null,
  };
}

function interactionMatchesGuild(interaction: DiscordInteraction): boolean {
  return typeof interaction.guild_id === "string" && interaction.guild_id === DISCORD_GUILD_ID();
}

async function upsertDiscordVerifyMessage() {
  const messagesResult = await fetchDiscordChannelMessages({
    channelId: DISCORD_VERIFY_CHANNEL_ID(),
    limit: 50,
  });

  if (!messagesResult.ok) {
    return { ok: false, code: messagesResult.code, message: messagesResult.message };
  }

  const existingMessage = messagesResult.messages.find((message) => (
    message.author?.id === DISCORD_APPLICATION_ID() && discordMessageHasVerifyButton(message)
  )) ?? messagesResult.messages.find(discordMessageHasVerifyButton);

  const payload = buildDiscordVerifyMessagePayload({
    title: DISCORD_VERIFY_MESSAGE_TITLE(),
    body: DISCORD_VERIFY_MESSAGE_BODY(),
  });

  if (existingMessage) {
    const patchResult = await patchDiscordChannelMessage({
      channelId: DISCORD_VERIFY_CHANNEL_ID(),
      messageId: existingMessage.id,
      body: payload,
    });

    return patchResult.ok
      ? { ok: true, action: "updated" as const }
      : { ok: false, code: patchResult.code, message: patchResult.message };
  }

  const createResult = await createDiscordChannelMessage({
    channelId: DISCORD_VERIFY_CHANNEL_ID(),
    body: payload,
  });

  return createResult.ok
    ? { ok: true, action: "created" as const }
    : { ok: false, code: createResult.code, message: createResult.message };
}

async function handleSetupVerifyInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This command can only be used in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasSetupPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to set up verification.");
  }

  const upsertResult = await upsertDiscordVerifyMessage();
  if (!upsertResult.ok) {
    console.error("[discord-interactions] setup-verify failed", {
      requestId: randomUUID(),
      code: upsertResult.code,
      message: upsertResult.message,
    });

    return buildDiscordEphemeralMessageResponse("Discord could not update the verification message right now.");
  }

  return buildDiscordEphemeralMessageResponse(
    upsertResult.action === "updated"
      ? "Verification message updated in the configured verify channel."
      : "Verification message created in the configured verify channel.",
  );
}

async function handleVerifyModalSubmit(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This verification flow is only available in the configured server.");
  }

  const token = extractDiscordModalTextInputValue(interaction.data?.components);
  const discordUser = resolveDiscordInteractionUser(interaction);

  if (!token || !discordUser.id) {
    return buildDiscordEphemeralMessageResponse("That token is invalid or expired. Generate a fresh token in Fitness and try again.");
  }

  const verificationResult = await consumeDiscordVerificationTokenForDiscordUser({
    token,
    discordUserId: discordUser.id,
    discordUsername: discordUser.username,
  });

  if (!verificationResult.ok && (
    verificationResult.code === "DISCORD_VERIFICATION_INVALID_INPUT"
    || verificationResult.code === "DISCORD_VERIFICATION_INVALID_OR_EXPIRED"
  )) {
    return buildDiscordEphemeralMessageResponse("That token is invalid or expired. Generate a fresh token in Fitness and try again.");
  }

  if (!verificationResult.ok) {
    return buildDiscordEphemeralMessageResponse("Fitness could not verify that token right now. Try again in a moment.");
  }

  const addRoleResult = await addDiscordGuildMemberRole({
    guildId: DISCORD_GUILD_ID(),
    userId: discordUser.id,
    roleId: DISCORD_VERIFIED_ROLE_ID(),
  });

  if (!addRoleResult.ok) {
    console.error("[discord-interactions] role assignment failed", {
      requestId: randomUUID(),
      code: addRoleResult.code,
      status: addRoleResult.status,
      message: addRoleResult.message,
    });

    return buildDiscordEphemeralMessageResponse(
      "Fitness verified your token, but Discord could not assign the role. Ask an admin to check the bot role position and Manage Roles permission.",
    );
  }

  const unverifiedRoleId = DISCORD_UNVERIFIED_ROLE_ID();
  if (unverifiedRoleId) {
    const removeRoleResult = await removeDiscordGuildMemberRole({
      guildId: DISCORD_GUILD_ID(),
      userId: discordUser.id,
      roleId: unverifiedRoleId,
    });

    if (!removeRoleResult.ok) {
      console.error("[discord-interactions] unverified role removal failed", {
        requestId: randomUUID(),
        code: removeRoleResult.code,
        status: removeRoleResult.status,
        message: removeRoleResult.message,
      });

      return buildDiscordEphemeralMessageResponse(
        "Fitness verified your token, but Discord could not assign the role. Ask an admin to check the bot role position and Manage Roles permission.",
      );
    }
  }

  return buildDiscordEphemeralMessageResponse("Verified. You now have access to the server.");
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");

  if (!signature || !timestamp || !verifyDiscordInteractionSignature({ rawBody, signature, timestamp })) {
    return jsonResponse({ error: "Invalid request signature." }, { status: 401 });
  }

  let interaction: DiscordInteraction;

  try {
    interaction = JSON.parse(rawBody) as DiscordInteraction;
  } catch {
    return jsonResponse({ error: "Invalid interaction payload." }, { status: 400 });
  }

  try {
    if (interaction.type === DISCORD_INTERACTION_TYPE.PING) {
      return jsonResponse(buildDiscordPongResponse());
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_VERIFY_COMMAND_NAME
    ) {
      return jsonResponse(await handleSetupVerifyInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
      && interaction.data?.custom_id === FITNESS_VERIFY_BUTTON_CUSTOM_ID
    ) {
      return jsonResponse(buildDiscordVerifyModalResponse());
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
      && interaction.data?.custom_id === FITNESS_VERIFY_MODAL_CUSTOM_ID
    ) {
      return jsonResponse(await handleVerifyModalSubmit(interaction));
    }

    return jsonResponse(buildDiscordEphemeralMessageResponse("Unsupported Discord interaction."), { status: 400 });
  } catch (error) {
    console.error("[discord-interactions] unhandled failure", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return jsonResponse(buildDiscordEphemeralMessageResponse("Discord verification is temporarily unavailable."), { status: 500 });
  }
}
