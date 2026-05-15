export const DISCORD_INTERACTION_TYPE = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  MODAL_SUBMIT: 5,
} as const;

export const DISCORD_INTERACTION_RESPONSE_TYPE = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  MODAL: 9,
} as const;

export const DISCORD_MESSAGE_FLAG_EPHEMERAL = 64;
export const FITNESS_VERIFY_BUTTON_CUSTOM_ID = "fitness_verify_open";
export const FITNESS_VERIFY_MODAL_CUSTOM_ID = "fitness_verify_modal";
export const FITNESS_VERIFY_TOKEN_INPUT_CUSTOM_ID = "fitness_token";
export const FITNESS_VERIFY_COMMAND_NAME = "setup-verify";
export const FITNESS_BUG_REPORT_COMMAND_NAME = "bug";
export const FITNESS_BUG_REPORT_MODAL_CUSTOM_ID = "fitness_bug_report_modal";
export const FITNESS_BUG_SUMMARY_INPUT_CUSTOM_ID = "bug_summary";
export const FITNESS_BUG_AREA_INPUT_CUSTOM_ID = "bug_area";
export const FITNESS_BUG_SEVERITY_INPUT_CUSTOM_ID = "bug_severity";
export const FITNESS_BUG_DETAILS_INPUT_CUSTOM_ID = "bug_details";
export const FITNESS_BUG_STEPS_INPUT_CUSTOM_ID = "bug_steps";
export const DEFAULT_VERIFY_MESSAGE_TITLE = "Verify your Fawxzzy Fitness account";
export const DEFAULT_VERIFY_MESSAGE_BODY_LINES = [
  "1. Sign into the Fitness app",
  "2. Generate a Discord verification token",
  "3. Click the button below",
  "4. Paste the token",
] as const;
export const DISCORD_PERMISSION_ADMINISTRATOR = BigInt(1) << BigInt(3);
export const DISCORD_PERMISSION_MANAGE_GUILD = BigInt(1) << BigInt(5);

type DiscordMessagePayload = {
  embeds: Array<{
    title: string;
    description: string;
  }>;
  components: Array<{
    type: 1;
    components: Array<{
      type: 2;
      style: 1;
      custom_id: string;
      label: string;
    }>;
  }>;
};

function coerceMultilineValue(value: string): string {
  return value.replace(/\\n/g, "\n");
}

export function resolveDiscordVerifyMessageTitle(value: string | null | undefined): string {
  return value?.trim() || DEFAULT_VERIFY_MESSAGE_TITLE;
}

export function resolveDiscordVerifyMessageBody(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_VERIFY_MESSAGE_BODY_LINES.join("\n");
  }

  return coerceMultilineValue(value).trim() || DEFAULT_VERIFY_MESSAGE_BODY_LINES.join("\n");
}

export function buildDiscordVerifyMessagePayload(args?: {
  title?: string | null;
  body?: string | null;
}): DiscordMessagePayload {
  return {
    embeds: [
      {
        title: resolveDiscordVerifyMessageTitle(args?.title),
        description: resolveDiscordVerifyMessageBody(args?.body),
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 1,
            custom_id: FITNESS_VERIFY_BUTTON_CUSTOM_ID,
            label: "Verify Fitness Account",
          },
        ],
      },
    ],
  };
}

export function buildDiscordPongResponse() {
  return { type: DISCORD_INTERACTION_RESPONSE_TYPE.PONG };
}

export function buildDiscordEphemeralMessageResponse(content: string) {
  return {
    type: DISCORD_INTERACTION_RESPONSE_TYPE.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content,
      flags: DISCORD_MESSAGE_FLAG_EPHEMERAL,
    },
  };
}

export function buildDiscordVerifyModalResponse() {
  return {
    type: DISCORD_INTERACTION_RESPONSE_TYPE.MODAL,
    data: {
      custom_id: FITNESS_VERIFY_MODAL_CUSTOM_ID,
      title: "Fitness Verification",
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: FITNESS_VERIFY_TOKEN_INPUT_CUSTOM_ID,
              style: 1,
              label: "Fitness verification token",
              placeholder: "FWX-XXXX-XXXX",
              required: true,
              max_length: 80,
            },
          ],
        },
      ],
    },
  };
}

export function buildDiscordBugReportModalResponse() {
  return {
    type: DISCORD_INTERACTION_RESPONSE_TYPE.MODAL,
    data: {
      custom_id: FITNESS_BUG_REPORT_MODAL_CUSTOM_ID,
      title: "Report a bug",
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: FITNESS_BUG_SUMMARY_INPUT_CUSTOM_ID,
              style: 1,
              label: "Summary",
              placeholder: "Example: Copy button does not work",
              required: true,
              max_length: 120,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: FITNESS_BUG_AREA_INPUT_CUSTOM_ID,
              style: 1,
              label: "Area",
              placeholder: "Settings, Discord verification, workout session...",
              required: false,
              max_length: 80,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: FITNESS_BUG_SEVERITY_INPUT_CUSTOM_ID,
              style: 1,
              label: "Severity",
              placeholder: "low, medium, high, blocker",
              required: false,
              max_length: 20,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: FITNESS_BUG_DETAILS_INPUT_CUSTOM_ID,
              style: 2,
              label: "What happened?",
              required: true,
              max_length: 1000,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: FITNESS_BUG_STEPS_INPUT_CUSTOM_ID,
              style: 2,
              label: "Steps / screenshot link",
              placeholder: "Steps to reproduce or screenshot URL",
              required: false,
              max_length: 1000,
            },
          ],
        },
      ],
    },
  };
}

export function extractDiscordModalTextInputValue(
  components: unknown,
  inputCustomId: string = FITNESS_VERIFY_TOKEN_INPUT_CUSTOM_ID,
): string | null {
  if (!Array.isArray(components)) {
    return null;
  }

  for (const actionRow of components) {
    if (!actionRow || typeof actionRow !== "object") {
      continue;
    }

    const rowComponents = "components" in actionRow ? (actionRow as { components?: unknown }).components : undefined;
    if (!Array.isArray(rowComponents)) {
      continue;
    }

    for (const component of rowComponents) {
      if (!component || typeof component !== "object") {
        continue;
      }

      const candidate = component as { custom_id?: unknown; value?: unknown };
      if (candidate.custom_id === inputCustomId && typeof candidate.value === "string") {
        return candidate.value;
      }
    }
  }

  return null;
}

export function discordMemberHasSetupPermission(permissions: string | null | undefined): boolean {
  if (!permissions) {
    return false;
  }

  try {
    const bitfield = BigInt(permissions);
    return (
      (bitfield & DISCORD_PERMISSION_ADMINISTRATOR) === DISCORD_PERMISSION_ADMINISTRATOR
      || (bitfield & DISCORD_PERMISSION_MANAGE_GUILD) === DISCORD_PERMISSION_MANAGE_GUILD
    );
  } catch {
    return false;
  }
}

export function discordMessageHasVerifyButton(message: unknown): boolean {
  if (!message || typeof message !== "object") {
    return false;
  }

  const components = "components" in message ? (message as { components?: unknown }).components : undefined;
  if (!Array.isArray(components)) {
    return false;
  }

  return components.some((actionRow) => {
    if (!actionRow || typeof actionRow !== "object") {
      return false;
    }

    const rowComponents = "components" in actionRow ? (actionRow as { components?: unknown }).components : undefined;
    if (!Array.isArray(rowComponents)) {
      return false;
    }

    return rowComponents.some((component) => (
      component
      && typeof component === "object"
      && "custom_id" in component
      && (component as { custom_id?: unknown }).custom_id === FITNESS_VERIFY_BUTTON_CUSTOM_ID
    ));
  });
}
