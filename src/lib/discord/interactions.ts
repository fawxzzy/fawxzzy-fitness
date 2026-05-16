export const DISCORD_INTERACTION_TYPE = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  MODAL_SUBMIT: 5,
} as const;

export const DISCORD_INTERACTION_RESPONSE_TYPE = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  MODAL: 9,
} as const;

export const DISCORD_MESSAGE_FLAG_EPHEMERAL = 64;
export const FITNESS_VERIFY_BUTTON_CUSTOM_ID = "fitness_verify_open";
export const FITNESS_VERIFY_MODAL_CUSTOM_ID = "fitness_verify_modal";
export const FITNESS_VERIFY_TOKEN_INPUT_CUSTOM_ID = "fitness_token";
export const FITNESS_VERIFY_COMMAND_NAME = "setup-verify";
export const FITNESS_FEEDBACK_SETUP_COMMAND_NAME = "setup-feedback";
export const FITNESS_FEEDBACK_COMMAND_NAME = "feedback";
export const FITNESS_FEEDBACK_STATUS_COMMAND_NAME = "feedback-status";
export const FITNESS_FEEDBACK_WITHDRAW_COMMAND_NAME = "feedback-withdraw";
export const FITNESS_UPDATE_LATEST_COMMAND_NAME = "update-latest";
export const FITNESS_UPDATE_PUBLISH_COMMAND_NAME = "update-publish";
export const FITNESS_UPDATE_SKIP_COMMAND_NAME = "update-skip";
export const FITNESS_FEEDBACK_REPORT_MODAL_CUSTOM_ID_PREFIX = "fitness_feedback_report_modal";
export const FITNESS_FEEDBACK_PANEL_SUBMIT_BUTTON_CUSTOM_ID = "fitness_feedback_submit_open";
export const FITNESS_FEEDBACK_PANEL_UPDATE_BUTTON_CUSTOM_ID = "fitness_feedback_update_open";
export const FITNESS_FEEDBACK_PANEL_WITHDRAW_BUTTON_CUSTOM_ID = "fitness_feedback_withdraw_open";
export const FITNESS_FEEDBACK_PANEL_SUBMIT_MODAL_CUSTOM_ID = "fitness_feedback_submit_modal";
export const FITNESS_FEEDBACK_UPDATE_MODAL_CUSTOM_ID = "fitness_feedback_update_modal";
export const FITNESS_FEEDBACK_WITHDRAW_MODAL_CUSTOM_ID = "fitness_feedback_withdraw_modal";
export const FITNESS_UPDATE_PUBLISH_MODAL_CUSTOM_ID_PREFIX = "fitness_update_publish_modal";
export const FITNESS_FEEDBACK_PANEL_TYPE_INPUT_CUSTOM_ID = "feedback_type";
export const FITNESS_BUG_SUMMARY_INPUT_CUSTOM_ID = "bug_summary";
export const FITNESS_BUG_AREA_INPUT_CUSTOM_ID = "bug_area";
export const FITNESS_BUG_SEVERITY_INPUT_CUSTOM_ID = "bug_severity";
export const FITNESS_BUG_DETAILS_INPUT_CUSTOM_ID = "bug_details";
export const FITNESS_BUG_STEPS_INPUT_CUSTOM_ID = "bug_steps";
export const FITNESS_FEEDBACK_ATTACHMENT_INPUT_CUSTOM_ID = "feedback_attachment";
export const FITNESS_FEEDBACK_UPDATE_REPORT_ID_INPUT_CUSTOM_ID = "feedback_update_report_id";
export const FITNESS_FEEDBACK_UPDATE_DETAILS_INPUT_CUSTOM_ID = "feedback_update_details";
export const FITNESS_FEEDBACK_WITHDRAW_REPORT_ID_INPUT_CUSTOM_ID = "feedback_withdraw_report_id";
export const FITNESS_FEEDBACK_WITHDRAW_NOTE_INPUT_CUSTOM_ID = "feedback_withdraw_note";
export const FITNESS_FEEDBACK_TYPE_OPTION_NAME = "type";
export const FITNESS_BUG_STATUS_REPORT_ID_OPTION_NAME = "report_id";
export const FITNESS_BUG_STATUS_STATUS_OPTION_NAME = "status";
export const FITNESS_BUG_STATUS_NOTE_OPTION_NAME = "note";
export const FITNESS_UPDATE_DRAFT_ID_OPTION_NAME = "draft_id";
export const FITNESS_UPDATE_SKIP_REASON_OPTION_NAME = "reason";
export const FITNESS_UPDATE_TITLE_INPUT_CUSTOM_ID = "update_title";
export const FITNESS_UPDATE_WHAT_CHANGED_INPUT_CUSTOM_ID = "update_what_changed";
export const FITNESS_UPDATE_WHY_IT_MATTERS_INPUT_CUSTOM_ID = "update_why_it_matters";
export const DEFAULT_VERIFY_MESSAGE_TITLE = "Verify your Fawxzzy Fitness account";
export const DEFAULT_FEEDBACK_PANEL_TITLE = "Fawxzzy Feedback";
export const DEFAULT_FEEDBACK_PANEL_BODY_LINES = [
  "Use this panel to help improve Fawxzzy Fitness.",
  "",
  "- Submit Feedback: report a bug or suggest a feature.",
  "- Update Feedback: add more details to feedback you submitted.",
  "- Withdraw Feedback: remove your submitted details without deleting the review record.",
  "",
  "Feedback posts appear in the Feedback forum so the team can review, tag, and follow up.",
  "",
  "Open the app:",
  "https://fawxzzy-fitness-local.vercel.app/login",
] as const;
export const DEFAULT_VERIFY_MESSAGE_BODY_LINES = [
  "To unlock the server:",
  "",
  "1. Sign into Fawxzzy Fitness.",
  "2. Go to Settings → Account → Discord Connector.",
  "3. Generate your Discord verification token.",
  "4. Click Verify below and paste the token.",
  "",
  "Fitness login:",
  "https://fawxzzy-fitness-local.vercel.app/login",
] as const;
export const DISCORD_PERMISSION_ADMINISTRATOR = BigInt(1) << BigInt(3);
export const DISCORD_PERMISSION_MANAGE_GUILD = BigInt(1) << BigInt(5);
export const DISCORD_PERMISSION_MANAGE_MESSAGES = BigInt(1) << BigInt(13);
export const DISCORD_PERMISSION_MANAGE_THREADS = BigInt(1) << BigInt(34);

export const DISCORD_BUG_STATUS_CHOICES = [
  { name: "new", value: "new" },
  { name: "needs_info", value: "needs_info" },
  { name: "confirmed", value: "confirmed" },
  { name: "in_progress", value: "in_progress" },
  { name: "fixed", value: "fixed" },
  { name: "closed", value: "closed" },
  { name: "duplicate", value: "duplicate" },
  { name: "spam", value: "spam" },
  { name: "withdrawn", value: "withdrawn" },
] as const;

export const DISCORD_FEEDBACK_TYPE_CHOICES = [
  { name: "Bug", value: "bug" },
  { name: "Feature", value: "feature" },
] as const;

type DiscordMessagePayload = {
  embeds: Array<{
    title: string;
    description: string;
  }>;
  components: Array<{
    type: 1;
    components: Array<{
      type: 2;
      style: 1 | 2 | 4;
      custom_id: string;
      label: string;
      emoji?: {
        id: string;
        name: string;
      };
    }>;
  }>;
};

type DiscordApplicationCommandDefinition = {
  name: string;
  description: string;
  default_member_permissions?: string;
  options?: Array<{
    type: number;
    name: string;
    description: string;
    required?: boolean;
    choices?: Array<{
      name: string;
      value: string;
    }>;
  }>;
};

type DiscordEmojiObject = {
  id: string;
  name: string;
};

type DiscordFeedbackEmojiMap = Partial<Record<"Bug" | "Feature", DiscordEmojiObject>>;

type DiscordModalLabelComponent = {
  type: 18;
  label: string;
  description?: string;
  component: Record<string, unknown>;
};

function coerceMultilineValue(value: string): string {
  return value.replace(/\\n/g, "\n");
}

function parseDiscordPermissionBitfield(permissions: string | null | undefined): bigint | null {
  if (!permissions) {
    return null;
  }

  try {
    return BigInt(permissions);
  } catch {
    return null;
  }
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

function buildDiscordModalLabelTextInput(args: {
  label: string;
  description?: string;
  customId: string;
  style: 1 | 2;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}): DiscordModalLabelComponent {
  return {
    type: 18,
    label: args.label,
    ...(args.description ? { description: args.description } : {}),
    component: {
      type: 4,
      custom_id: args.customId,
      style: args.style,
      ...(args.placeholder ? { placeholder: args.placeholder } : {}),
      required: args.required ?? true,
      ...(typeof args.maxLength === "number" ? { max_length: args.maxLength } : {}),
    },
  };
}

function buildDiscordFeedbackTypeSelectComponent(args?: {
  defaultReportType?: "bug" | "feature" | null;
  emojis?: DiscordFeedbackEmojiMap | null;
}): DiscordModalLabelComponent {
  const defaultReportType = args?.defaultReportType ?? null;
  const bugEmoji = args?.emojis?.Bug;
  const featureEmoji = args?.emojis?.Feature;

  return {
    type: 18,
    label: "Feedback type",
    description: "Choose Bug or Feature.",
    component: {
      type: 3,
      custom_id: FITNESS_FEEDBACK_PANEL_TYPE_INPUT_CUSTOM_ID,
      required: true,
      placeholder: defaultReportType === "feature" ? "Feature" : "Bug",
      options: [
        {
          label: "Bug",
          value: "bug",
          description: "Report something broken or not working right.",
          ...(bugEmoji ? { emoji: bugEmoji } : {}),
          default: defaultReportType === "bug",
        },
        {
          label: "Feature",
          value: "feature",
          description: "Suggest an improvement or new capability.",
          ...(featureEmoji ? { emoji: featureEmoji } : {}),
          default: defaultReportType === "feature",
        },
      ],
    },
  };
}

function buildDiscordFeedbackAttachmentComponent(): DiscordModalLabelComponent {
  return {
    type: 18,
    label: "Screenshot or image",
    description: "Optional. Upload up to 3 PNG, JPG, WEBP, or GIF images.",
    component: {
      type: 19,
      custom_id: FITNESS_FEEDBACK_ATTACHMENT_INPUT_CUSTOM_ID,
      required: false,
      min_values: 0,
      max_values: 3,
    },
  };
}

function buildDiscordFeedbackSubmitModalData(args?: {
  customId?: string;
  title?: string;
  defaultReportType?: "bug" | "feature" | null;
  emojis?: DiscordFeedbackEmojiMap | null;
}) {
  const defaultReportType = args?.defaultReportType ?? null;

  return {
    custom_id: args?.customId ?? FITNESS_FEEDBACK_PANEL_SUBMIT_MODAL_CUSTOM_ID,
    title: args?.title ?? "Submit Feedback",
    components: [
      buildDiscordFeedbackTypeSelectComponent({
        defaultReportType,
        emojis: args?.emojis,
      }),
      buildDiscordModalLabelTextInput({
        label: "Summary",
        customId: FITNESS_BUG_SUMMARY_INPUT_CUSTOM_ID,
        style: 1,
        placeholder: defaultReportType === "feature"
          ? "Example: Add a weekly goal view"
          : "Example: Copy button does not work",
        required: true,
        maxLength: 120,
      }),
      buildDiscordModalLabelTextInput({
        label: "Area",
        customId: FITNESS_BUG_AREA_INPUT_CUSTOM_ID,
        style: 1,
        placeholder: "Settings, Discord Connector, session...",
        required: false,
        maxLength: 80,
      }),
      buildDiscordModalLabelTextInput({
        label: defaultReportType === "feature" ? "What do you want?" : "What happened?",
        description: "Include the steps, context, or expected behavior in one place.",
        customId: FITNESS_BUG_DETAILS_INPUT_CUSTOM_ID,
        style: 2,
        required: true,
        maxLength: 1200,
      }),
      buildDiscordFeedbackAttachmentComponent(),
    ],
  };
}

export function buildDiscordFeedbackPanelMessagePayload(args?: {
  emojis?: DiscordFeedbackEmojiMap | null;
}): DiscordMessagePayload {
  const bugEmoji = args?.emojis?.Bug;

  return {
    embeds: [
      {
        title: DEFAULT_FEEDBACK_PANEL_TITLE,
        description: DEFAULT_FEEDBACK_PANEL_BODY_LINES.join("\n"),
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 1,
            custom_id: FITNESS_FEEDBACK_PANEL_SUBMIT_BUTTON_CUSTOM_ID,
            label: "Submit Feedback",
            emoji: bugEmoji,
          },
          {
            type: 2,
            style: 2,
            custom_id: FITNESS_FEEDBACK_PANEL_UPDATE_BUTTON_CUSTOM_ID,
            label: "Update Feedback",
          },
          {
            type: 2,
            style: 4,
            custom_id: FITNESS_FEEDBACK_PANEL_WITHDRAW_BUTTON_CUSTOM_ID,
            label: "Withdraw Feedback",
          },
        ],
      },
    ],
  };
}

export function buildDiscordGuildCommandsDefinition(): DiscordApplicationCommandDefinition[] {
  const setupDefaultPermissions = String(DISCORD_PERMISSION_MANAGE_GUILD);
  const feedbackStatusDefaultPermissions = String(
    DISCORD_PERMISSION_MANAGE_GUILD
    | DISCORD_PERMISSION_MANAGE_THREADS
    | DISCORD_PERMISSION_MANAGE_MESSAGES,
  );

  return [
    {
      name: FITNESS_VERIFY_COMMAND_NAME,
      description: "Post or refresh the Fitness verification message.",
      default_member_permissions: setupDefaultPermissions,
    },
    {
      name: FITNESS_FEEDBACK_SETUP_COMMAND_NAME,
      description: "Post or refresh the Fitness feedback panel.",
      default_member_permissions: setupDefaultPermissions,
    },
    {
      name: FITNESS_FEEDBACK_COMMAND_NAME,
      description: "Send Fitness feedback.",
    },
    {
      name: FITNESS_FEEDBACK_STATUS_COMMAND_NAME,
      description: "Update a Fitness feedback report status.",
      default_member_permissions: feedbackStatusDefaultPermissions,
      options: [
        {
          type: 3,
          name: FITNESS_BUG_STATUS_REPORT_ID_OPTION_NAME,
          description: "Report ID, short ID, thread ID, or forum URL.",
          required: true,
        },
        {
          type: 3,
          name: FITNESS_BUG_STATUS_STATUS_OPTION_NAME,
          description: "New feedback report status.",
          required: true,
          choices: [...DISCORD_BUG_STATUS_CHOICES],
        },
        {
          type: 3,
          name: FITNESS_BUG_STATUS_NOTE_OPTION_NAME,
          description: "Optional status note to add in the forum thread.",
          required: false,
        },
      ],
    },
    {
      name: FITNESS_FEEDBACK_WITHDRAW_COMMAND_NAME,
      description: "Withdraw feedback you submitted.",
      options: [
        {
          type: 3,
          name: FITNESS_BUG_STATUS_REPORT_ID_OPTION_NAME,
          description: "Report ID, short ID, thread ID, or forum URL.",
          required: true,
        },
      ],
    },
    {
      name: FITNESS_UPDATE_LATEST_COMMAND_NAME,
      description: "Show the latest production update drafts.",
      default_member_permissions: feedbackStatusDefaultPermissions,
    },
    {
      name: FITNESS_UPDATE_PUBLISH_COMMAND_NAME,
      description: "Publish a curated Fitness app update.",
      default_member_permissions: feedbackStatusDefaultPermissions,
      options: [
        {
          type: 3,
          name: FITNESS_UPDATE_DRAFT_ID_OPTION_NAME,
          description: "Draft ID or short draft ID.",
          required: true,
        },
      ],
    },
    {
      name: FITNESS_UPDATE_SKIP_COMMAND_NAME,
      description: "Skip a production update draft.",
      default_member_permissions: feedbackStatusDefaultPermissions,
      options: [
        {
          type: 3,
          name: FITNESS_UPDATE_DRAFT_ID_OPTION_NAME,
          description: "Draft ID or short draft ID.",
          required: true,
        },
        {
          type: 3,
          name: FITNESS_UPDATE_SKIP_REASON_OPTION_NAME,
          description: "Optional reason for skipping this draft.",
          required: false,
        },
      ],
    },
  ];
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

export function buildDiscordDeferredEphemeralMessageResponse() {
  return {
    type: DISCORD_INTERACTION_RESPONSE_TYPE.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
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

export function buildDiscordFeedbackPanelSubmitModalResponse(args?: {
  emojis?: DiscordFeedbackEmojiMap | null;
}) {
  return {
    type: DISCORD_INTERACTION_RESPONSE_TYPE.MODAL,
    data: buildDiscordFeedbackSubmitModalData({
      emojis: args?.emojis,
    }),
  };
}

export function buildDiscordFeedbackUpdateModalResponse() {
  return {
    type: DISCORD_INTERACTION_RESPONSE_TYPE.MODAL,
    data: {
      custom_id: FITNESS_FEEDBACK_UPDATE_MODAL_CUSTOM_ID,
      title: "Update Feedback",
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: FITNESS_FEEDBACK_UPDATE_REPORT_ID_INPUT_CUSTOM_ID,
              style: 1,
              label: "Report ID or forum link",
              placeholder: "Short ID, UUID, thread ID, or forum URL",
              required: true,
              max_length: 200,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: FITNESS_FEEDBACK_UPDATE_DETAILS_INPUT_CUSTOM_ID,
              style: 2,
              label: "Update details",
              required: true,
              max_length: 1000,
            },
          ],
        },
      ],
    },
  };
}

export function buildDiscordFeedbackWithdrawModalResponse() {
  return {
    type: DISCORD_INTERACTION_RESPONSE_TYPE.MODAL,
    data: {
      custom_id: FITNESS_FEEDBACK_WITHDRAW_MODAL_CUSTOM_ID,
      title: "Withdraw Feedback",
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: FITNESS_FEEDBACK_WITHDRAW_REPORT_ID_INPUT_CUSTOM_ID,
              style: 1,
              label: "Report ID or forum link",
              placeholder: "Short ID, UUID, thread ID, or forum URL",
              required: true,
              max_length: 200,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: FITNESS_FEEDBACK_WITHDRAW_NOTE_INPUT_CUSTOM_ID,
              style: 2,
              label: "Optional note",
              required: false,
              max_length: 500,
            },
          ],
        },
      ],
    },
  };
}

export function buildDiscordUpdatePublishModalCustomId(draftId: string) {
  return `${FITNESS_UPDATE_PUBLISH_MODAL_CUSTOM_ID_PREFIX}:${draftId}`;
}

export function extractDiscordUpdateDraftIdFromPublishModalCustomId(customId: string | null | undefined): string | null {
  if (!customId?.startsWith(`${FITNESS_UPDATE_PUBLISH_MODAL_CUSTOM_ID_PREFIX}:`)) {
    return null;
  }

  const draftId = customId.slice(FITNESS_UPDATE_PUBLISH_MODAL_CUSTOM_ID_PREFIX.length + 1).trim();
  return draftId || null;
}

export function buildDiscordUpdatePublishModalResponse(draftId: string) {
  return {
    type: DISCORD_INTERACTION_RESPONSE_TYPE.MODAL,
    data: {
      custom_id: buildDiscordUpdatePublishModalCustomId(draftId),
      title: "Publish Fitness Update",
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: FITNESS_UPDATE_TITLE_INPUT_CUSTOM_ID,
              style: 1,
              label: "Title",
              placeholder: "Example: Better feedback tools are live",
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
              custom_id: FITNESS_UPDATE_WHAT_CHANGED_INPUT_CUSTOM_ID,
              style: 2,
              label: "What changed",
              placeholder: "One bullet or short line per user-facing change",
              required: true,
              max_length: 1500,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: FITNESS_UPDATE_WHY_IT_MATTERS_INPUT_CUSTOM_ID,
              style: 2,
              label: "Why it matters",
              placeholder: "Explain the user-facing value in one or two short sentences",
              required: true,
              max_length: 800,
            },
          ],
        },
      ],
    },
  };
}

export function buildDiscordFeedbackModalCustomId(reportType: "bug" | "feature" | "fix") {
  return `${FITNESS_FEEDBACK_REPORT_MODAL_CUSTOM_ID_PREFIX}:${reportType}`;
}

export function resolveDiscordFeedbackReportTypeFromModalCustomId(customId: string | null | undefined): "bug" | "feature" | null {
  if (!customId?.startsWith(`${FITNESS_FEEDBACK_REPORT_MODAL_CUSTOM_ID_PREFIX}:`)) {
    return null;
  }

  const reportType = customId.slice(FITNESS_FEEDBACK_REPORT_MODAL_CUSTOM_ID_PREFIX.length + 1);
  if (reportType === "bug" || reportType === "feature") {
    return reportType;
  }

  if (reportType === "feat") {
    return "feature";
  }

  return null;
}

export function buildDiscordFeedbackReportModalResponse(reportType: "bug" | "feature") {
  const title = reportType === "bug"
    ? "Report a bug"
    : "Suggest a feature";

  return {
    type: DISCORD_INTERACTION_RESPONSE_TYPE.MODAL,
    data: buildDiscordFeedbackSubmitModalData({
      customId: buildDiscordFeedbackModalCustomId(reportType),
      title,
      defaultReportType: reportType,
    }),
  };
}

export function extractDiscordModalTextInputValue(
  components: unknown,
  inputCustomId: string = FITNESS_VERIFY_TOKEN_INPUT_CUSTOM_ID,
): string | null {
  if (!Array.isArray(components)) {
    return null;
  }

  for (const modalComponent of components) {
    if (!modalComponent || typeof modalComponent !== "object") {
      continue;
    }

    const rowComponents = "components" in modalComponent ? (modalComponent as { components?: unknown }).components : undefined;
    if (Array.isArray(rowComponents)) {
      for (const component of rowComponents) {
        if (!component || typeof component !== "object") {
          continue;
        }

        const candidate = component as { custom_id?: unknown; value?: unknown };
        if (candidate.custom_id === inputCustomId && typeof candidate.value === "string") {
          return candidate.value;
        }
      }

      continue;
    }

    const labelChild = "component" in modalComponent ? (modalComponent as { component?: unknown }).component : undefined;
    if (!labelChild || typeof labelChild !== "object") {
      continue;
    }

    const candidate = labelChild as { custom_id?: unknown; value?: unknown };
    if (candidate.custom_id === inputCustomId && typeof candidate.value === "string") {
      return candidate.value;
    }
  }

  return null;
}

export function extractDiscordModalStringSelectValue(
  components: unknown,
  inputCustomId: string,
): string | null {
  if (!Array.isArray(components)) {
    return null;
  }

  for (const modalComponent of components) {
    if (!modalComponent || typeof modalComponent !== "object") {
      continue;
    }

    const labelChild = "component" in modalComponent ? (modalComponent as { component?: unknown }).component : undefined;
    if (!labelChild || typeof labelChild !== "object") {
      continue;
    }

    const candidate = labelChild as { custom_id?: unknown; values?: unknown };
    if (
      candidate.custom_id === inputCustomId
      && Array.isArray(candidate.values)
      && typeof candidate.values[0] === "string"
    ) {
      return candidate.values[0];
    }
  }

  return null;
}

export function extractDiscordModalFileUploadIds(
  components: unknown,
  inputCustomId: string,
): string[] {
  if (!Array.isArray(components)) {
    return [];
  }

  for (const modalComponent of components) {
    if (!modalComponent || typeof modalComponent !== "object") {
      continue;
    }

    const labelChild = "component" in modalComponent ? (modalComponent as { component?: unknown }).component : undefined;
    if (!labelChild || typeof labelChild !== "object") {
      continue;
    }

    const candidate = labelChild as { custom_id?: unknown; values?: unknown };
    if (candidate.custom_id !== inputCustomId || !Array.isArray(candidate.values)) {
      continue;
    }

    return candidate.values.filter((value): value is string => typeof value === "string");
  }

  return [];
}

export function extractDiscordCommandStringOption(options: unknown, optionName: string): string | null {
  if (!Array.isArray(options)) {
    return null;
  }

  for (const option of options) {
    if (!option || typeof option !== "object") {
      continue;
    }

    const candidate = option as { name?: unknown; value?: unknown };
    if (candidate.name === optionName && typeof candidate.value === "string") {
      return candidate.value;
    }
  }

  return null;
}

export function discordMemberHasSetupPermission(permissions: string | null | undefined): boolean {
  const bitfield = parseDiscordPermissionBitfield(permissions);
  if (bitfield === null) {
    return false;
  }

  return (
    (bitfield & DISCORD_PERMISSION_ADMINISTRATOR) === DISCORD_PERMISSION_ADMINISTRATOR
    || (bitfield & DISCORD_PERMISSION_MANAGE_GUILD) === DISCORD_PERMISSION_MANAGE_GUILD
  );
}

export function discordMemberHasBugStatusPermission(permissions: string | null | undefined): boolean {
  const bitfield = parseDiscordPermissionBitfield(permissions);
  if (bitfield === null) {
    return false;
  }

  return (
    (bitfield & DISCORD_PERMISSION_ADMINISTRATOR) === DISCORD_PERMISSION_ADMINISTRATOR
    || (bitfield & DISCORD_PERMISSION_MANAGE_GUILD) === DISCORD_PERMISSION_MANAGE_GUILD
    || (bitfield & DISCORD_PERMISSION_MANAGE_THREADS) === DISCORD_PERMISSION_MANAGE_THREADS
    || (bitfield & DISCORD_PERMISSION_MANAGE_MESSAGES) === DISCORD_PERMISSION_MANAGE_MESSAGES
  );
}

export function discordMessageHasVerifyButton(message: unknown): boolean {
  return discordMessageHasComponentCustomId(message, FITNESS_VERIFY_BUTTON_CUSTOM_ID);
}

export function discordMessageHasFeedbackPanel(message: unknown): boolean {
  return [
    FITNESS_FEEDBACK_PANEL_SUBMIT_BUTTON_CUSTOM_ID,
    FITNESS_FEEDBACK_PANEL_UPDATE_BUTTON_CUSTOM_ID,
    FITNESS_FEEDBACK_PANEL_WITHDRAW_BUTTON_CUSTOM_ID,
  ].every((customId) => discordMessageHasComponentCustomId(message, customId));
}

function discordMessageHasComponentCustomId(message: unknown, customId: string): boolean {
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
      && (component as { custom_id?: unknown }).custom_id === customId
    ));
  });
}
