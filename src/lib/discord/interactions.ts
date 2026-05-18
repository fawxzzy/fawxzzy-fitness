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
export const FITNESS_VERIFY_CLEANUP_COMMAND_NAME = "verify-cleanup";
export const FITNESS_VERIFY_LOCKDOWN_COMMAND_NAME = "verify-lockdown";
export const FITNESS_FEEDBACK_SETUP_COMMAND_NAME = "setup-feedback";
export const FITNESS_FEEDBACK_COMMAND_NAME = "feedback";
export const FITNESS_FEEDBACK_STATUS_COMMAND_NAME = "feedback-status";
export const FITNESS_FEEDBACK_COMPLETION_REVIEW_COMMAND_NAME = "feedback-completion-review";
export const FITNESS_FEEDBACK_WITHDRAW_COMMAND_NAME = "feedback-withdraw";
export const FITNESS_UPDATE_LATEST_COMMAND_NAME = "update-latest";
export const FITNESS_UPDATE_PUBLISH_COMMAND_NAME = "update-publish";
export const FITNESS_UPDATE_SKIP_COMMAND_NAME = "update-skip";
export const FITNESS_PURGATORY_SETUP_COMMAND_NAME = "purgatory-setup";
export const FITNESS_WARN_COMMAND_NAME = "warn";
export const FITNESS_WARNINGS_COMMAND_NAME = "warnings";
export const FITNESS_WARNING_CLEAR_COMMAND_NAME = "warning-clear";
export const FITNESS_PURGATORY_COMMAND_NAME = "purgatory";
export const FITNESS_RELEASE_COMMAND_NAME = "release";
export const FITNESS_MOD_LOG_COMMAND_NAME = "mod-log";
export const FITNESS_SERVER_INVENTORY_COMMAND_NAME = "server-inventory";
export const FITNESS_FEEDBACK_REPORT_MODAL_CUSTOM_ID_PREFIX = "fitness_feedback_report_modal";
export const FITNESS_FEEDBACK_PANEL_SUBMIT_BUTTON_CUSTOM_ID = "fitness_feedback_submit_open";
export const FITNESS_FEEDBACK_PANEL_UPDATE_BUTTON_CUSTOM_ID = "fitness_feedback_update_open";
export const FITNESS_FEEDBACK_PANEL_SUBMIT_MODAL_CUSTOM_ID = "fitness_feedback_submit_modal";
export const FITNESS_FEEDBACK_WITHDRAW_MODAL_CUSTOM_ID = "fitness_feedback_withdraw_modal";
export const FITNESS_FEEDBACK_UPDATE_PICKER_SELECT_CUSTOM_ID = "fitness_feedback_update_pick_report";
export const FITNESS_FEEDBACK_UPDATE_EDIT_MODAL_CUSTOM_ID_PREFIX = "fitness_feedback_update_edit_modal";
export const FITNESS_FEEDBACK_UPDATE_PICKER_BUTTON_CUSTOM_ID_PREFIX = "fitness_feedback_manage_recent";
export const FITNESS_FEEDBACK_UPDATE_PICKER_LOOKUP_BUTTON_CUSTOM_ID = "fitness_feedback_manage_lookup_open";
export const FITNESS_FEEDBACK_UPDATE_PICKER_LOOKUP_MODAL_CUSTOM_ID = "fitness_feedback_manage_lookup_modal";
export const FITNESS_FEEDBACK_UPDATE_PICKER_LOOKUP_INPUT_CUSTOM_ID = "feedback_manage_lookup";
export const FITNESS_FEEDBACK_MANAGE_EDIT_BUTTON_CUSTOM_ID_PREFIX = "fitness_feedback_manage_action_edit";
export const FITNESS_FEEDBACK_MANAGE_WITHDRAW_BUTTON_CUSTOM_ID_PREFIX = "fitness_feedback_manage_action_withdraw";
export const FITNESS_FEEDBACK_MANAGE_CANCEL_BUTTON_CUSTOM_ID = "fitness_feedback_manage_action_cancel";
export const FITNESS_FEEDBACK_WITHDRAW_SELECTED_MODAL_CUSTOM_ID_PREFIX = "fitness_feedback_withdraw_selected_modal";
export const FITNESS_UPDATE_PUBLISH_MODAL_CUSTOM_ID_PREFIX = "fitness_update_publish_modal";
export const FITNESS_FEEDBACK_PANEL_TYPE_INPUT_CUSTOM_ID = "feedback_type";
export const FITNESS_BUG_SUMMARY_INPUT_CUSTOM_ID = "bug_summary";
export const FITNESS_BUG_AREA_INPUT_CUSTOM_ID = "bug_area";
export const FITNESS_BUG_SEVERITY_INPUT_CUSTOM_ID = "bug_severity";
export const FITNESS_BUG_DETAILS_INPUT_CUSTOM_ID = "bug_details";
export const FITNESS_BUG_STEPS_INPUT_CUSTOM_ID = "bug_steps";
export const FITNESS_FEEDBACK_ATTACHMENT_INPUT_CUSTOM_ID = "feedback_attachment";
export const FITNESS_FEEDBACK_UPDATE_REPORT_SELECT_CUSTOM_ID = "feedback_update_report_select";
export const FITNESS_FEEDBACK_UPDATE_REPORT_ID_INPUT_CUSTOM_ID = "feedback_update_report_id";
export const FITNESS_FEEDBACK_UPDATE_DETAILS_INPUT_CUSTOM_ID = "feedback_update_details";
export const FITNESS_FEEDBACK_WITHDRAW_REPORT_SELECT_CUSTOM_ID = "feedback_withdraw_report_select";
export const FITNESS_FEEDBACK_WITHDRAW_REPORT_ID_INPUT_CUSTOM_ID = "feedback_withdraw_report_id";
export const FITNESS_FEEDBACK_WITHDRAW_NOTE_INPUT_CUSTOM_ID = "feedback_withdraw_note";
export const FITNESS_FEEDBACK_TYPE_OPTION_NAME = "type";
export const FITNESS_BUG_STATUS_REPORT_ID_OPTION_NAME = "report_id";
export const FITNESS_BUG_STATUS_STATUS_OPTION_NAME = "status";
export const FITNESS_BUG_STATUS_NOTE_OPTION_NAME = "note";
export const FITNESS_FEEDBACK_COMPLETION_REVIEW_DECISION_OPTION_NAME = "decision";
export const FITNESS_UPDATE_DRAFT_ID_OPTION_NAME = "draft_id";
export const FITNESS_UPDATE_SKIP_REASON_OPTION_NAME = "reason";
export const FITNESS_PURGATORY_USER_OPTION_NAME = "user";
export const FITNESS_PURGATORY_REASON_OPTION_NAME = "reason";
export const FITNESS_PURGATORY_DURATION_OPTION_NAME = "duration";
export const FITNESS_WARNING_SEVERITY_OPTION_NAME = "severity";
export const FITNESS_RELEASE_CASE_ID_OPTION_NAME = "case_id";
export const FITNESS_RELEASE_NOTE_OPTION_NAME = "note";
export const FITNESS_MOD_LOG_LIMIT_OPTION_NAME = "limit";
export const FITNESS_UPDATE_TITLE_INPUT_CUSTOM_ID = "update_title";
export const FITNESS_UPDATE_WHAT_CHANGED_INPUT_CUSTOM_ID = "update_what_changed";
export const FITNESS_UPDATE_WHY_IT_MATTERS_INPUT_CUSTOM_ID = "update_why_it_matters";
export const DEFAULT_VERIFY_MESSAGE_TITLE = "Fawxzzy Server Access";
export const DEFAULT_VERIFY_MESSAGE_BODY = [
  "Welcome to Fawxzzy. To unlock the server, verify your Fawxzzy Fitness account.",
  "",
  "### Server Rules",
  "",
  "**Be respectful**",
  "No harassment, hate speech, threats, bullying, or personal attacks.",
  "",
  "**No spam**",
  "Do not flood chats, repeat messages, abuse caps, mass mention people, or spam bot commands.",
  "",
  "**Use the right channels**",
  "Keep posts where they belong. Feedback, support, updates, and general chat each have their own spaces.",
  "",
  "**No unsafe links**",
  "No scams, phishing, malware, fake giveaways, suspicious downloads, or links meant to trick people.",
  "",
  "**Keep it clean**",
  "No NSFW, gore, shock content, or graphic material.",
  "",
  "**Protect privacy**",
  "Do not share private info, screenshots, emails, tokens, API keys, or login details.",
  "",
  "**Do not bypass verification**",
  "Do not abuse roles, impersonate staff, exploit bots, or try to access restricted areas.",
  "",
  "### How to Verify",
  "",
  "1. Sign into Fawxzzy Fitness.",
  "2. Go to **Settings -> Account -> Discord Connector**.",
  "3. Generate your Discord verification token.",
  "4. Click **Verify Fitness Account** below.",
  "5. Paste your token.",
  "",
  "Open Fitness:",
  "<https://fawxzzy-fitness-local.vercel.app/login>",
  "",
  "By verifying, you agree to follow the server rules.",
].join("\n");
export const DEFAULT_FEEDBACK_PANEL_TITLE = "Submit Feedback Here";
export const DEFAULT_FEEDBACK_PANEL_BODY_LINES = [
  "Use this channel to send a new bug or feature request.",
  "",
  "- Submit: create a new feedback card.",
  "- Edit: manage one of your existing cards, including withdraw.",
  "",
  "Your feedback card will appear in the Feedback forum after submit.",
] as const;
export const DISCORD_PERMISSION_ADMINISTRATOR = BigInt(1) << BigInt(3);
export const DISCORD_PERMISSION_MANAGE_CHANNELS = BigInt(1) << BigInt(4);
export const DISCORD_PERMISSION_MANAGE_GUILD = BigInt(1) << BigInt(5);
export const DISCORD_PERMISSION_ADD_REACTIONS = BigInt(1) << BigInt(6);
export const DISCORD_PERMISSION_VIEW_CHANNEL = BigInt(1) << BigInt(10);
export const DISCORD_PERMISSION_SEND_MESSAGES = BigInt(1) << BigInt(11);
export const DISCORD_PERMISSION_MANAGE_MESSAGES = BigInt(1) << BigInt(13);
export const DISCORD_PERMISSION_READ_MESSAGE_HISTORY = BigInt(1) << BigInt(16);
export const DISCORD_PERMISSION_MANAGE_ROLES = BigInt(1) << BigInt(28);
export const DISCORD_PERMISSION_MANAGE_THREADS = BigInt(1) << BigInt(34);
export const DISCORD_PERMISSION_CREATE_PUBLIC_THREADS = BigInt(1) << BigInt(35);
export const DISCORD_PERMISSION_CREATE_PRIVATE_THREADS = BigInt(1) << BigInt(36);
export const DISCORD_PERMISSION_SEND_MESSAGES_IN_THREADS = BigInt(1) << BigInt(38);

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

export const DISCORD_FEEDBACK_COMPLETION_REVIEW_DECISION_CHOICES = [
  { name: "approved", value: "approved" },
  { name: "needs_followup", value: "needs_followup" },
] as const;

export const DISCORD_FEEDBACK_TYPE_CHOICES = [
  { name: "Bug", value: "bug" },
  { name: "Feature", value: "feature" },
] as const;

export const DISCORD_MODERATION_WARNING_SEVERITY_CHOICES = [
  { name: "Notice", value: "notice" },
  { name: "Warning", value: "warning" },
  { name: "Critical", value: "critical" },
] as const;
type DiscordButtonComponent = {
  type: 2;
  style: 1 | 2 | 4;
  custom_id: string;
  label: string;
  disabled?: boolean;
  emoji?: {
    id: string;
    name: string;
  };
};

type DiscordStringSelectComponent = {
  type: 3;
  custom_id: string;
  placeholder?: string;
  options: DiscordFeedbackReportSelectOption[];
  min_values?: number;
  max_values?: number;
};

type DiscordMessagePayload = {
  embeds: Array<{
    title: string;
    description: string;
  }>;
  components: Array<{
    type: 1;
    components: Array<DiscordButtonComponent | DiscordStringSelectComponent>;
  }>;
};

type DiscordApplicationCommandDefinition = {
  name: string;
  description: string;
  default_member_permissions?: string;
  options?: Array<{
    type: 3 | 4 | 6;
    name: string;
    description: string;
    required?: boolean;
    min_value?: number;
    max_value?: number;
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

type DiscordFeedbackReportSelectOption = {
  label: string;
  value: string;
  description?: string;
  default?: boolean;
};

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
    return DEFAULT_VERIFY_MESSAGE_BODY;
  }

  return coerceMultilineValue(value).trim() || DEFAULT_VERIFY_MESSAGE_BODY;
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
  value?: string;
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
      ...(typeof args.value === "string" ? { value: args.value } : {}),
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

function buildDiscordFeedbackReportSelectComponent(args: {
  label: string;
  description: string;
  customId: string;
  placeholder: string;
  options: DiscordFeedbackReportSelectOption[];
}): DiscordModalLabelComponent {
  return {
    type: 18,
    label: args.label,
    description: args.description,
    component: {
      type: 3,
      custom_id: args.customId,
      required: false,
      placeholder: args.placeholder,
      options: args.options.map((option) => ({
        label: option.label,
        value: option.value,
        ...(option.description ? { description: option.description } : {}),
        ...(option.default ? { default: true } : {}),
      })),
    },
  };
}

function buildDiscordFeedbackAttachmentComponent(): DiscordModalLabelComponent {
  return {
    type: 18,
    label: "Attachment",
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
        label: "Title",
        customId: FITNESS_BUG_SUMMARY_INPUT_CUSTOM_ID,
        style: 1,
        placeholder: defaultReportType === "feature"
          ? "Example: Add a weekly goal dashboard"
          : "Example: Recovery screen closes after save",
        required: true,
        maxLength: 120,
      }),
      buildDiscordModalLabelTextInput({
        label: "Area / screen",
        customId: FITNESS_BUG_AREA_INPUT_CUSTOM_ID,
        style: 1,
        placeholder: "Settings, Recovery, Discord Feedback...",
        required: false,
        maxLength: 80,
      }),
      buildDiscordModalLabelTextInput({
        label: defaultReportType === "feature" || defaultReportType === "bug"
          ? "Description"
          : "Details",
        description: "Describe the issue or idea clearly. Include steps, context, or expected behavior if that helps.",
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
          },
          {
            type: 2,
            style: 2,
            custom_id: FITNESS_FEEDBACK_PANEL_UPDATE_BUTTON_CUSTOM_ID,
            label: "Edit My Feedback",
          },
        ],
      },
    ],
  };
}

export function buildDiscordGuildCommandsDefinition(): DiscordApplicationCommandDefinition[] {
  const setupDefaultPermissions = String(DISCORD_PERMISSION_MANAGE_GUILD);
  const moderationDefaultPermissions = String(
    DISCORD_PERMISSION_MANAGE_GUILD
    | DISCORD_PERMISSION_MANAGE_ROLES,
  );
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
      name: FITNESS_VERIFY_CLEANUP_COMMAND_NAME,
      description: "Remove clutter from #verify and keep one official access panel.",
      default_member_permissions: setupDefaultPermissions,
    },
    {
      name: FITNESS_VERIFY_LOCKDOWN_COMMAND_NAME,
      description: "Lock #verify so only the bot and staff can manage the access panel.",
      default_member_permissions: setupDefaultPermissions,
    },
    {
      name: FITNESS_FEEDBACK_SETUP_COMMAND_NAME,
      description: "Post or refresh the Fitness feedback launcher.",
      default_member_permissions: setupDefaultPermissions,
    },
    {
      name: FITNESS_FEEDBACK_COMMAND_NAME,
      description: "Send Fitness feedback.",
      default_member_permissions: setupDefaultPermissions,
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
      name: FITNESS_FEEDBACK_COMPLETION_REVIEW_COMMAND_NAME,
      description: "Approve or flag follow-up for a completed Fitness feedback card.",
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
          name: FITNESS_FEEDBACK_COMPLETION_REVIEW_DECISION_OPTION_NAME,
          description: "Completion review decision.",
          required: true,
          choices: [...DISCORD_FEEDBACK_COMPLETION_REVIEW_DECISION_CHOICES],
        },
        {
          type: 3,
          name: FITNESS_BUG_STATUS_NOTE_OPTION_NAME,
          description: "Optional completion review note.",
          required: false,
        },
      ],
    },
    {
      name: FITNESS_FEEDBACK_WITHDRAW_COMMAND_NAME,
      description: "Withdraw feedback you submitted.",
      default_member_permissions: setupDefaultPermissions,
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
    {
      name: FITNESS_PURGATORY_SETUP_COMMAND_NAME,
      description: "Create or verify the reversible Purgatory moderation setup.",
      default_member_permissions: moderationDefaultPermissions,
    },
    {
      name: FITNESS_WARN_COMMAND_NAME,
      description: "Log a moderation notice, warning, or critical escalation.",
      default_member_permissions: moderationDefaultPermissions,
      options: [
        {
          type: 6,
          name: FITNESS_PURGATORY_USER_OPTION_NAME,
          description: "User to warn.",
          required: true,
        },
        {
          type: 3,
          name: FITNESS_WARNING_SEVERITY_OPTION_NAME,
          description: "Warning severity to log.",
          required: true,
          choices: [...DISCORD_MODERATION_WARNING_SEVERITY_CHOICES],
        },
        {
          type: 3,
          name: FITNESS_PURGATORY_REASON_OPTION_NAME,
          description: "Why this user is being warned.",
          required: true,
        },
      ],
    },
    {
      name: FITNESS_WARNINGS_COMMAND_NAME,
      description: "Show recent warning and Purgatory history for a user.",
      default_member_permissions: moderationDefaultPermissions,
      options: [
        {
          type: 6,
          name: FITNESS_PURGATORY_USER_OPTION_NAME,
          description: "User to review.",
          required: true,
        },
        {
          type: 4,
          name: FITNESS_MOD_LOG_LIMIT_OPTION_NAME,
          description: "Optional number of recent cases to show.",
          required: false,
          min_value: 1,
          max_value: 10,
        },
      ],
    },
    {
      name: FITNESS_WARNING_CLEAR_COMMAND_NAME,
      description: "Resolve a logged notice or warning without deleting it.",
      default_member_permissions: moderationDefaultPermissions,
      options: [
        {
          type: 3,
          name: FITNESS_RELEASE_CASE_ID_OPTION_NAME,
          description: "Case UUID or short case id.",
          required: true,
        },
        {
          type: 3,
          name: FITNESS_PURGATORY_REASON_OPTION_NAME,
          description: "Optional reason for resolving this warning.",
          required: false,
        },
      ],
    },
    {
      name: FITNESS_PURGATORY_COMMAND_NAME,
      description: "Move a user into reversible Purgatory isolation.",
      default_member_permissions: moderationDefaultPermissions,
      options: [
        {
          type: 6,
          name: FITNESS_PURGATORY_USER_OPTION_NAME,
          description: "User to isolate in Purgatory.",
          required: true,
        },
        {
          type: 3,
          name: FITNESS_PURGATORY_REASON_OPTION_NAME,
          description: "Why this user is being moved to Purgatory.",
          required: true,
        },
        {
          type: 3,
          name: FITNESS_PURGATORY_DURATION_OPTION_NAME,
          description: "Optional duration like 10m, 1h, or 1d.",
          required: false,
        },
      ],
    },
    {
      name: FITNESS_RELEASE_COMMAND_NAME,
      description: "Release a user from Purgatory and restore safe roles.",
      default_member_permissions: moderationDefaultPermissions,
      options: [
        {
          type: 6,
          name: FITNESS_PURGATORY_USER_OPTION_NAME,
          description: "User with an active Purgatory case.",
          required: false,
        },
        {
          type: 3,
          name: FITNESS_RELEASE_CASE_ID_OPTION_NAME,
          description: "Case UUID or short case id.",
          required: false,
        },
        {
          type: 3,
          name: FITNESS_RELEASE_NOTE_OPTION_NAME,
          description: "Optional release note.",
          required: false,
        },
      ],
    },
    {
      name: FITNESS_MOD_LOG_COMMAND_NAME,
      description: "Show recent Purgatory moderation cases.",
      default_member_permissions: moderationDefaultPermissions,
      options: [
        {
          type: 6,
          name: FITNESS_PURGATORY_USER_OPTION_NAME,
          description: "Optional user filter.",
          required: false,
        },
        {
          type: 4,
          name: FITNESS_MOD_LOG_LIMIT_OPTION_NAME,
          description: "Optional number of recent cases to show.",
          required: false,
          min_value: 1,
          max_value: 10,
        },
      ],
    },
    {
      name: FITNESS_SERVER_INVENTORY_COMMAND_NAME,
      description: "Show important server channel, role, emoji, and tag ids.",
      default_member_permissions: moderationDefaultPermissions,
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

export function buildDiscordFeedbackUpdatePickerResponse(args: {
  recentReports: DiscordFeedbackReportSelectOption[];
}) {
  const recentButtons = args.recentReports.slice(0, 3).map((report) => ({
    type: 2 as const,
    style: 2 as const,
    custom_id: `${FITNESS_FEEDBACK_UPDATE_PICKER_BUTTON_CUSTOM_ID_PREFIX}:${report.value}`,
    label: truncateComponentLabel(report.label),
  }));

  return {
    type: DISCORD_INTERACTION_RESPONSE_TYPE.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: "Choose a feedback card to manage.",
      flags: DISCORD_MESSAGE_FLAG_EPHEMERAL,
      components: [
        ...(recentButtons.length > 0 ? [{
          type: 1,
          components: recentButtons,
        }] : []),
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: FITNESS_FEEDBACK_UPDATE_PICKER_SELECT_CUSTOM_ID,
              placeholder: "More of your recent cards",
              min_values: 1,
              max_values: 1,
              options: args.recentReports.slice(0, 25),
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 2,
              custom_id: FITNESS_FEEDBACK_UPDATE_PICKER_LOOKUP_BUTTON_CUSTOM_ID,
              label: "Enter ID / Link",
            },
          ],
        },
      ],
    },
  };
}

function truncateComponentLabel(value: string, maxLength = 80) {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function extractReportIdFromPrefixedCustomId(prefix: string, customId: string | null | undefined) {
  if (!customId?.startsWith(`${prefix}:`)) {
    return null;
  }

  const reportId = customId.slice(prefix.length + 1).trim();
  return reportId || null;
}

export function extractDiscordFeedbackUpdatePickerReportId(customId: string | null | undefined) {
  return extractReportIdFromPrefixedCustomId(FITNESS_FEEDBACK_UPDATE_PICKER_BUTTON_CUSTOM_ID_PREFIX, customId);
}

export function buildDiscordFeedbackUpdateModalCustomId(reportId: string) {
  return `${FITNESS_FEEDBACK_UPDATE_EDIT_MODAL_CUSTOM_ID_PREFIX}:${reportId}`;
}

export function extractDiscordFeedbackUpdateReportIdFromModalCustomId(customId: string | null | undefined) {
  if (!customId?.startsWith(`${FITNESS_FEEDBACK_UPDATE_EDIT_MODAL_CUSTOM_ID_PREFIX}:`)) {
    return null;
  }

  const reportId = customId.slice(FITNESS_FEEDBACK_UPDATE_EDIT_MODAL_CUSTOM_ID_PREFIX.length + 1).trim();
  return reportId || null;
}

export function buildDiscordFeedbackUpdateModalResponse(args: {
  reportId: string;
  summary: string;
  area?: string | null;
  details: string;
}) {
  return {
    type: DISCORD_INTERACTION_RESPONSE_TYPE.MODAL,
    data: {
      custom_id: buildDiscordFeedbackUpdateModalCustomId(args.reportId),
      title: "Edit Feedback Card",
      components: [
        buildDiscordModalLabelTextInput({
          label: "Title",
          customId: FITNESS_BUG_SUMMARY_INPUT_CUSTOM_ID,
          style: 1,
          value: args.summary,
          required: true,
          maxLength: 120,
        }),
        buildDiscordModalLabelTextInput({
          label: "Area",
          customId: FITNESS_BUG_AREA_INPUT_CUSTOM_ID,
          style: 1,
          value: args.area ?? "",
          required: false,
          maxLength: 80,
        }),
        buildDiscordModalLabelTextInput({
          label: "Description / what happened",
          description: "Edit the main card text. Saving updates the live forum post.",
          customId: FITNESS_BUG_DETAILS_INPUT_CUSTOM_ID,
          style: 2,
          value: args.details,
          required: true,
          maxLength: 1200,
        }),
      ],
    },
  };
}

export function buildDiscordFeedbackManageLookupModalResponse() {
  return {
    type: DISCORD_INTERACTION_RESPONSE_TYPE.MODAL,
    data: {
      custom_id: FITNESS_FEEDBACK_UPDATE_PICKER_LOOKUP_MODAL_CUSTOM_ID,
      title: "Find Feedback Card",
      components: [
        buildDiscordModalLabelTextInput({
          label: "Report ID or forum link",
          description: "Paste a short id, full id, thread id, or forum URL.",
          customId: FITNESS_FEEDBACK_UPDATE_PICKER_LOOKUP_INPUT_CUSTOM_ID,
          style: 1,
          placeholder: "b88b31ba or https://discord.com/channels/...",
          required: true,
          maxLength: 200,
        }),
      ],
    },
  };
}

export function buildDiscordFeedbackManageCardResponse(args: {
  reportId: string;
  summary: string;
  statusLabel: string;
  typeLabel: string;
  area?: string | null;
}) {
  const areaLabel = args.area?.trim() ? `\nArea: ${args.area.trim()}` : "";
  return {
    type: DISCORD_INTERACTION_RESPONSE_TYPE.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content:
        `Manage \`${args.reportId.slice(0, 8)}\`.\n`
        + `${args.typeLabel} • ${args.statusLabel}${areaLabel}\n`
        + `${args.summary}`,
      flags: DISCORD_MESSAGE_FLAG_EPHEMERAL,
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 1,
              custom_id: `${FITNESS_FEEDBACK_MANAGE_EDIT_BUTTON_CUSTOM_ID_PREFIX}:${args.reportId}`,
              label: "Edit Card",
            },
            {
              type: 2,
              style: 4,
              custom_id: `${FITNESS_FEEDBACK_MANAGE_WITHDRAW_BUTTON_CUSTOM_ID_PREFIX}:${args.reportId}`,
              label: "Withdraw",
            },
            {
              type: 2,
              style: 2,
              custom_id: FITNESS_FEEDBACK_MANAGE_CANCEL_BUTTON_CUSTOM_ID,
              label: "Cancel",
            },
          ],
        },
      ],
    },
  };
}

export function extractDiscordFeedbackManageEditReportId(customId: string | null | undefined) {
  return extractReportIdFromPrefixedCustomId(FITNESS_FEEDBACK_MANAGE_EDIT_BUTTON_CUSTOM_ID_PREFIX, customId);
}

export function extractDiscordFeedbackManageWithdrawReportId(customId: string | null | undefined) {
  return extractReportIdFromPrefixedCustomId(FITNESS_FEEDBACK_MANAGE_WITHDRAW_BUTTON_CUSTOM_ID_PREFIX, customId);
}

export function buildDiscordFeedbackWithdrawModalResponse(args?: {
  recentReports?: DiscordFeedbackReportSelectOption[] | null;
}) {
  const recentReports = Array.isArray(args?.recentReports) && args.recentReports.length > 0
    ? args.recentReports.slice(0, 25)
    : null;

  return {
    type: DISCORD_INTERACTION_RESPONSE_TYPE.MODAL,
    data: {
      custom_id: FITNESS_FEEDBACK_WITHDRAW_MODAL_CUSTOM_ID,
      title: "Withdraw Feedback",
      components: [
        ...(recentReports
          ? [buildDiscordFeedbackReportSelectComponent({
            label: "Recent cards",
            description: "Pick one of your recent cards or paste a report id below.",
            customId: FITNESS_FEEDBACK_WITHDRAW_REPORT_SELECT_CUSTOM_ID,
            placeholder: "Select a recent card",
            options: recentReports,
          })]
          : []),
        buildDiscordModalLabelTextInput({
          label: "Report ID or forum link",
          description: recentReports ? "Optional if you choose a recent card above." : undefined,
          customId: FITNESS_FEEDBACK_WITHDRAW_REPORT_ID_INPUT_CUSTOM_ID,
          style: 1,
          placeholder: "Short ID, UUID, thread ID, or forum URL",
          required: !recentReports,
          maxLength: 200,
        }),
        buildDiscordModalLabelTextInput({
          label: "Optional note",
          customId: FITNESS_FEEDBACK_WITHDRAW_NOTE_INPUT_CUSTOM_ID,
          style: 2,
          required: false,
          maxLength: 500,
        }),
      ],
    },
  };
}

export function buildDiscordFeedbackWithdrawSelectedModalResponse(args: {
  reportId: string;
  summary: string;
}) {
  return {
    type: DISCORD_INTERACTION_RESPONSE_TYPE.MODAL,
    data: {
      custom_id: `${FITNESS_FEEDBACK_WITHDRAW_SELECTED_MODAL_CUSTOM_ID_PREFIX}:${args.reportId}`,
      title: "Withdraw Feedback",
      components: [
        buildDiscordModalLabelTextInput({
          label: "Optional note",
          description: `We will withdraw "${truncateComponentLabel(args.summary, 60)}" and keep a small audit record.`,
          customId: FITNESS_FEEDBACK_WITHDRAW_NOTE_INPUT_CUSTOM_ID,
          style: 2,
          required: false,
          maxLength: 500,
        }),
      ],
    },
  };
}

export function extractDiscordFeedbackWithdrawSelectedReportId(customId: string | null | undefined) {
  return extractReportIdFromPrefixedCustomId(FITNESS_FEEDBACK_WITHDRAW_SELECTED_MODAL_CUSTOM_ID_PREFIX, customId);
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
  const option = extractDiscordCommandOption(options, optionName);
  return option && typeof option.value === "string" ? option.value : null;
}

function extractDiscordCommandOption(
  options: unknown,
  optionName: string,
): { name?: unknown; value?: unknown } | null {
  if (!Array.isArray(options)) {
    return null;
  }

  for (const option of options) {
    if (!option || typeof option !== "object") {
      continue;
    }

    const candidate = option as { name?: unknown; value?: unknown };
    if (candidate.name === optionName) {
      return candidate;
    }
  }

  return null;
}

export function extractDiscordCommandUserOption(options: unknown, optionName: string): string | null {
  const option = extractDiscordCommandOption(options, optionName);
  return option && typeof option.value === "string" ? option.value : null;
}

export function extractDiscordCommandIntegerOption(options: unknown, optionName: string): number | null {
  const option = extractDiscordCommandOption(options, optionName);
  return option && typeof option.value === "number" && Number.isInteger(option.value) ? option.value : null;
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

export function discordMemberHasModerationPermission(permissions: string | null | undefined): boolean {
  const bitfield = parseDiscordPermissionBitfield(permissions);
  if (bitfield === null) {
    return false;
  }

  return (
    (bitfield & DISCORD_PERMISSION_ADMINISTRATOR) === DISCORD_PERMISSION_ADMINISTRATOR
    || (bitfield & DISCORD_PERMISSION_MANAGE_GUILD) === DISCORD_PERMISSION_MANAGE_GUILD
    || (bitfield & DISCORD_PERMISSION_MANAGE_ROLES) === DISCORD_PERMISSION_MANAGE_ROLES
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
