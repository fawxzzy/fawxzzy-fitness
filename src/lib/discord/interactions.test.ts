import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscordDeferredEphemeralMessageResponse,
  buildDiscordFeedbackManageCardResponse,
  buildDiscordFeedbackManageLookupModalResponse,
  buildDiscordFeedbackPanelMessagePayload,
  buildDiscordFeedbackPanelSubmitModalResponse,
  buildDiscordSpotifyClubPanelMessagePayload,
  buildDiscordSpotifyQueueSuggestModalResponse,
  buildDiscordFeedbackUpdatePickerResponse,
  buildDiscordFeedbackReportModalResponse,
  buildDiscordFeedbackUpdateModalResponse,
  buildDiscordFeedbackWithdrawSelectedModalResponse,
  buildDiscordUpdatePublishModalResponse,
  buildDiscordGuildCommandsDefinition,
  buildDiscordPongResponse,
  buildDiscordVerifyModalResponse,
  buildDiscordVerifyMessagePayload,
  discordMemberHasBugStatusPermission,
  discordMemberHasModerationPermission,
  discordMessageHasFeedbackPanel,
  discordMessageHasSpotifyClubPanel,
  discordMemberHasSetupPermission,
  extractDiscordCommandIntegerOption,
  extractDiscordCommandSubcommand,
  extractDiscordCommandStringOption,
  extractDiscordCommandUserOption,
  extractDiscordFeedbackManageEditReportId,
  extractDiscordFeedbackManageWithdrawReportId,
  extractDiscordFeedbackUpdatePickerReportId,
  extractDiscordFeedbackUpdateReportIdFromModalCustomId,
  extractDiscordFeedbackWithdrawSelectedReportId,
  extractDiscordModalFileUploadIds,
  extractDiscordModalStringSelectValue,
  extractDiscordModalTextInputValue,
  extractDiscordUpdateDraftIdFromPublishModalCustomId,
  resolveDiscordFeedbackReportTypeFromModalCustomId,
  resolveDiscordVerifyMessageBody,
} from "./interactions.ts";

test("buildDiscordPongResponse returns Discord PONG type", () => {
  assert.deepEqual(buildDiscordPongResponse(), { type: 1 });
});

test("buildDiscordDeferredEphemeralMessageResponse returns a deferred ephemeral interaction response", () => {
  assert.deepEqual(buildDiscordDeferredEphemeralMessageResponse(), {
    type: 5,
    data: {
      flags: 64,
    },
  });
});

test("buildDiscordVerifyModalResponse returns the expected modal payload", () => {
  const response = buildDiscordVerifyModalResponse();

  assert.equal(response.type, 9);
  assert.equal(response.data.custom_id, "fitness_verify_modal");
  assert.equal(response.data.components[0]?.components[0]?.custom_id, "fitness_token");
});

test("buildDiscordFeedbackReportModalResponse adapts the title and custom id by feedback type", () => {
  const bug = buildDiscordFeedbackReportModalResponse("bug");
  const feature = buildDiscordFeedbackReportModalResponse("feature");
  const bugOptions = (bug.data.components[0]?.component as { options?: Array<{ default?: boolean }> } | undefined)?.options;
  const featureOptions = (feature.data.components[0]?.component as { options?: Array<{ default?: boolean }> } | undefined)?.options;

  assert.equal(bug.data.custom_id, "fitness_feedback_report_modal:bug");
  assert.equal(bug.data.title, "Report a bug");
  assert.equal(bug.data.components[0]?.component?.custom_id, "feedback_type");
  assert.equal(bug.data.components[1]?.label, "Title");
  assert.equal(bug.data.components[3]?.label, "Description");
  assert.equal(bugOptions?.[0]?.default, true);
  assert.equal(feature.data.custom_id, "fitness_feedback_report_modal:feature");
  assert.equal(feature.data.title, "Suggest a feature");
  assert.equal(feature.data.components[1]?.label, "Title");
  assert.equal(feature.data.components[3]?.label, "Description");
  assert.equal(featureOptions?.[1]?.default, true);
});

test("buildDiscordFeedbackPanelMessagePayload includes the persistent panel buttons", () => {
  const payload = buildDiscordFeedbackPanelMessagePayload();

  assert.equal(payload.embeds[0]?.title, "Submit Feedback Here");
  assert.match(payload.embeds[0]?.description ?? "", /send a new bug or feature request/i);
  assert.deepEqual(
    payload.components[0]?.components?.map((component) => component.custom_id),
    [
      "fitness_feedback_submit_open",
      "fitness_feedback_update_open",
    ],
  );
  assert.deepEqual(
    payload.components[0]?.components?.map((component) => ("label" in component ? component.label : null)),
    ["Submit Feedback", "Edit My Feedback"],
  );
});

test("discordMessageHasFeedbackPanel detects the feedback panel action row", () => {
  assert.equal(discordMessageHasFeedbackPanel(buildDiscordFeedbackPanelMessagePayload()), true);
  assert.equal(discordMessageHasFeedbackPanel(buildDiscordVerifyMessagePayload()), false);
});

test("buildDiscordSpotifyClubPanelMessagePayload exposes every normal-user Spotify Club action on the panel", () => {
  const payload = buildDiscordSpotifyClubPanelMessagePayload({
    lobbyStatusLabel: "Open",
    hostDiscordUserId: "123456789012345678",
    queuePreviewLines: ["1. Hey Ya! - Outkast"],
    pendingSuggestionCount: 2,
  });

  assert.equal(payload.embeds[0]?.title, "Spotify Club");
  assert.match(payload.embeds[0]?.description ?? "", /Status: \*\*Open\*\*/);
  assert.match(payload.embeds[0]?.description ?? "", /<@123456789012345678>/);
  assert.match(payload.embeds[0]?.description ?? "", /Queue:/);
  assert.match(payload.embeds[0]?.description ?? "", /Hey Ya! - Outkast/);
  assert.match(payload.embeds[0]?.description ?? "", /Pending suggestions: 2/);
  assert.match(payload.embeds[0]?.description ?? "", /does not stream audio through Discord/i);
  assert.match(payload.embeds[0]?.description ?? "", /Playback Ready means Spotify permissions and an active device are ready for handoff/i);
  assert.deepEqual(
    payload.components[0]?.components?.map((component) => component.custom_id),
    ["spotify_connect_open", "spotify_status_check", "spotify_disconnect"],
  );
  assert.deepEqual(
    payload.components[1]?.components?.map((component) => component.custom_id),
    ["spotify_queue_suggest_open", "spotify_queue_view", "spotify_device_check"],
  );
  assert.deepEqual(
    payload.components[2]?.components?.map((component) => component.custom_id),
    ["spotify_start_queue", "spotify_join_placeholder"],
  );
  const visibleButtonIds = payload.components.flatMap((row) => row.components.map((component) => component.custom_id));
  assert.deepEqual(
    visibleButtonIds,
    [
      "spotify_connect_open",
      "spotify_status_check",
      "spotify_disconnect",
      "spotify_queue_suggest_open",
      "spotify_queue_view",
      "spotify_device_check",
      "spotify_start_queue",
      "spotify_join_placeholder",
    ],
  );
  const queueButtons = payload.components[1]?.components ?? [];
  const playbackButtons = payload.components[2]?.components ?? [];
  assert.equal(queueButtons[0] && "disabled" in queueButtons[0] ? queueButtons[0].disabled ?? false : false, false);
  assert.equal(queueButtons[1] && "disabled" in queueButtons[1] ? queueButtons[1].disabled ?? false : false, false);
  assert.equal(queueButtons[2] && "disabled" in queueButtons[2] ? queueButtons[2].disabled ?? false : false, false);
  assert.equal(playbackButtons[0] && "disabled" in playbackButtons[0] ? playbackButtons[0].disabled ?? false : false, false);
  assert.equal(playbackButtons[1] && "disabled" in playbackButtons[1] ? playbackButtons[1].disabled ?? false : false, true);
  assert.equal(discordMessageHasSpotifyClubPanel(payload), true);
});

test("buildDiscordSpotifyQueueSuggestModalResponse opens the queue suggestion modal", () => {
  const response = buildDiscordSpotifyQueueSuggestModalResponse();

  assert.equal(response.type, 9);
  assert.equal(response.data.custom_id, "spotify_queue_suggest_modal");
  assert.equal(response.data.components[0]?.component?.custom_id, "spotify_track");
});

test("resolveDiscordFeedbackReportTypeFromModalCustomId supports feedback modals only", () => {
  assert.equal(resolveDiscordFeedbackReportTypeFromModalCustomId("fitness_feedback_report_modal:feature"), "feature");
  assert.equal(resolveDiscordFeedbackReportTypeFromModalCustomId("fitness_feedback_report_modal:feat"), "feature");
  assert.equal(resolveDiscordFeedbackReportTypeFromModalCustomId("fitness_feedback_report_modal:fix"), null);
  assert.equal(resolveDiscordFeedbackReportTypeFromModalCustomId("nope"), null);
});

test("extractDiscordModalTextInputValue reads the submitted token from Discord component rows", () => {
  const token = extractDiscordModalTextInputValue([
    {
      type: 1,
      components: [
        {
          type: 4,
          custom_id: "fitness_token",
          value: "FWX-ABCD-EFGH",
        },
      ],
    },
  ]);

  assert.equal(token, "FWX-ABCD-EFGH");
});

test("extractDiscordModalStringSelectValue and file upload ids read label-wrapped modal components", () => {
  const components = [
    {
      type: 18,
      label: "Feedback type",
      component: {
        type: 3,
        custom_id: "feedback_type",
        values: ["feature"],
      },
    },
    {
      type: 18,
      label: "Attachment",
      component: {
        type: 19,
        custom_id: "feedback_attachment",
        values: ["att-1", "att-2"],
      },
    },
  ];

  assert.equal(extractDiscordModalStringSelectValue(components, "feedback_type"), "feature");
  assert.deepEqual(extractDiscordModalFileUploadIds(components, "feedback_attachment"), ["att-1", "att-2"]);
});

test("extractDiscordCommandStringOption reads string slash-command options", () => {
  const value = extractDiscordCommandStringOption([
    { type: 3, name: "report_id", value: "abc12345" },
    { type: 3, name: "status", value: "confirmed" },
  ], "status");

  assert.equal(value, "confirmed");
});

test("extractDiscordCommandUserOption and integer option read typed slash-command options", () => {
  const options = [
    { type: 6, name: "user", value: "123456789012345678" },
    { type: 4, name: "limit", value: 7 },
  ];

  assert.equal(extractDiscordCommandUserOption(options, "user"), "123456789012345678");
  assert.equal(extractDiscordCommandIntegerOption(options, "limit"), 7);
});

test("extractDiscordCommandSubcommand reads nested slash-command subcommands", () => {
  const subcommand = extractDiscordCommandSubcommand([
    {
      type: 1,
      name: "connect",
      options: [
        { type: 3, name: "note", value: "ignored" },
      ],
    },
  ]);

  assert.equal(subcommand?.name, "connect");
  assert.deepEqual(subcommand?.options, [
    { type: 3, name: "note", value: "ignored" },
  ]);
});

test("resolveDiscordVerifyMessageBody converts escaped newlines into rendered lines", () => {
  assert.equal(
    resolveDiscordVerifyMessageBody("Line 1\\nLine 2"),
    "Line 1\nLine 2",
  );
});

test("buildDiscordVerifyMessagePayload includes the verify button", () => {
  const payload = buildDiscordVerifyMessagePayload();

  assert.equal(payload.components[0]?.components[0]?.custom_id, "fitness_verify_open");
});

test("resolveDiscordVerifyMessageBody returns the locked access-panel copy", () => {
  assert.equal(
    resolveDiscordVerifyMessageBody(null),
    [
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
    ].join("\n"),
  );
});

test("buildDiscordVerifyMessagePayload uses the Fawxzzy Server Access title", () => {
  const payload = buildDiscordVerifyMessagePayload();

  assert.equal(payload.embeds[0]?.title, "Fawxzzy Server Access");
});

test("feedback panel button modals expose submit and manage flows", () => {
  const submit = buildDiscordFeedbackPanelSubmitModalResponse();
  const updatePicker = buildDiscordFeedbackUpdatePickerResponse({
    recentReports: [
      {
        label: "11111111 | Token copy button failed",
        value: "11111111-1111-4111-8111-111111111111",
        description: "Bug | New | Settings",
      },
      {
        label: "22222222 | Login screen jumps",
        value: "22222222-2222-4222-8222-222222222222",
        description: "Bug | New | Login",
      },
    ],
  });
  const manageCard = buildDiscordFeedbackManageCardResponse({
    reportId: "11111111-1111-4111-8111-111111111111",
    summary: "Token copy button failed",
    area: "Settings",
    statusLabel: "New",
    typeLabel: "Bug",
  });
  const lookupModal = buildDiscordFeedbackManageLookupModalResponse();
  const update = buildDiscordFeedbackUpdateModalResponse({
    reportId: "11111111-1111-4111-8111-111111111111",
    summary: "Token copy button failed",
    area: "Settings",
    details: "I tapped Copy and nothing happened.",
  });
  const withdraw = buildDiscordFeedbackWithdrawSelectedModalResponse({
    reportId: "11111111-1111-4111-8111-111111111111",
    summary: "Token copy button failed",
  });

  assert.equal(submit.data.custom_id, "fitness_feedback_submit_modal");
  assert.equal(submit.data.components[0]?.component?.custom_id, "feedback_type");
  assert.equal(submit.data.components[1]?.label, "Title");
  assert.equal(submit.data.components[3]?.label, "Details");
  assert.equal(submit.data.components[4]?.label, "Attachment");
  assert.equal(submit.data.components[4]?.component?.custom_id, "feedback_attachment");
  assert.equal(submit.data.components[4]?.component?.max_values, 3);
  assert.equal(updatePicker.data.flags, 64);
  assert.equal(updatePicker.data.components[0]?.components[0]?.custom_id, "fitness_feedback_manage_recent:11111111-1111-4111-8111-111111111111");
  assert.equal(updatePicker.data.components[1]?.components[0]?.custom_id, "fitness_feedback_update_pick_report");
  assert.equal(updatePicker.data.components[2]?.components[0]?.custom_id, "fitness_feedback_manage_lookup_open");
  assert.equal(manageCard.data.components[0]?.components[0]?.custom_id, "fitness_feedback_manage_action_edit:11111111-1111-4111-8111-111111111111");
  assert.equal(manageCard.data.components[0]?.components[1]?.custom_id, "fitness_feedback_manage_action_withdraw:11111111-1111-4111-8111-111111111111");
  assert.equal(lookupModal.data.custom_id, "fitness_feedback_manage_lookup_modal");
  assert.equal(lookupModal.data.components[0]?.component?.custom_id, "feedback_manage_lookup");
  assert.equal(update.data.custom_id, "fitness_feedback_update_edit_modal:11111111-1111-4111-8111-111111111111");
  assert.equal(update.data.components[0]?.component?.custom_id, "bug_summary");
  assert.equal(update.data.components[0]?.component?.value, "Token copy button failed");
  assert.equal(update.data.components[1]?.component?.custom_id, "bug_area");
  assert.equal(update.data.components[2]?.component?.custom_id, "bug_details");
  assert.equal(withdraw.data.custom_id, "fitness_feedback_withdraw_selected_modal:11111111-1111-4111-8111-111111111111");
  assert.equal(withdraw.data.components[0]?.component?.custom_id, "feedback_withdraw_note");
});

test("feedback submit modal keeps panel buttons text-only while select options use validated emoji payloads", () => {
  const emojis = {
    Bug: { id: "1505007702924066916", name: "Bug" },
    Feature: { id: "1505007651308703877", name: "Feature" },
  };

  const panelPayload = buildDiscordFeedbackPanelMessagePayload({ emojis });
  const submitModal = buildDiscordFeedbackPanelSubmitModalResponse({ emojis });
  const options = (submitModal.data.components[0]?.component as { options?: Array<{ emoji?: { id: string; name: string } }> } | undefined)?.options;
  const firstPanelButton = panelPayload.components[0]?.components[0] as { emoji?: { id: string; name: string } } | undefined;

  assert.equal(firstPanelButton?.emoji, undefined);
  assert.deepEqual(options?.[0]?.emoji, {
    id: "1505007702924066916",
    name: "Bug",
  });
  assert.deepEqual(options?.[1]?.emoji, {
    id: "1505007651308703877",
    name: "Feature",
  });
});

test("update publish modal shape includes the draft id in the modal custom id", () => {
  const response = buildDiscordUpdatePublishModalResponse("11111111-1111-4111-8111-111111111111");

  assert.equal(response.type, 9);
  assert.equal(
    response.data.custom_id,
    "fitness_update_publish_modal:11111111-1111-4111-8111-111111111111",
  );
  assert.equal(response.data.components[0]?.components[0]?.custom_id, "update_title");
  assert.equal(response.data.components[1]?.components[0]?.custom_id, "update_what_changed");
  assert.equal(response.data.components[2]?.components[0]?.custom_id, "update_why_it_matters");
});

test("extractDiscordUpdateDraftIdFromPublishModalCustomId parses publish modal ids only", () => {
  assert.equal(
    extractDiscordUpdateDraftIdFromPublishModalCustomId(
      "fitness_update_publish_modal:11111111-1111-4111-8111-111111111111",
    ),
    "11111111-1111-4111-8111-111111111111",
  );
  assert.equal(extractDiscordUpdateDraftIdFromPublishModalCustomId("fitness_feedback_submit_modal"), null);
});

test("extractDiscordFeedbackUpdateReportIdFromModalCustomId parses update edit modal ids only", () => {
  assert.equal(
    extractDiscordFeedbackUpdateReportIdFromModalCustomId(
      "fitness_feedback_update_edit_modal:11111111-1111-4111-8111-111111111111",
    ),
    "11111111-1111-4111-8111-111111111111",
  );
  assert.equal(extractDiscordFeedbackUpdateReportIdFromModalCustomId("fitness_feedback_update_modal"), null);
});

test("feedback manage custom id helpers parse selection, edit, and withdraw ids only", () => {
  assert.equal(
    extractDiscordFeedbackUpdatePickerReportId(
      "fitness_feedback_manage_recent:11111111-1111-4111-8111-111111111111",
    ),
    "11111111-1111-4111-8111-111111111111",
  );
  assert.equal(
    extractDiscordFeedbackManageEditReportId(
      "fitness_feedback_manage_action_edit:11111111-1111-4111-8111-111111111111",
    ),
    "11111111-1111-4111-8111-111111111111",
  );
  assert.equal(
    extractDiscordFeedbackManageWithdrawReportId(
      "fitness_feedback_manage_action_withdraw:11111111-1111-4111-8111-111111111111",
    ),
    "11111111-1111-4111-8111-111111111111",
  );
  assert.equal(
    extractDiscordFeedbackWithdrawSelectedReportId(
      "fitness_feedback_withdraw_selected_modal:11111111-1111-4111-8111-111111111111",
    ),
    "11111111-1111-4111-8111-111111111111",
  );
});

test("feedback panel payload stays text-only even when custom emoji env vars are set", () => {
  process.env.DISCORD_FEEDBACK_BUG_EMOJI_ID = "1505007702924068916";
  process.env.DISCORD_FEEDBACK_FEATURE_EMOJI_ID = "1505007651308703877";

  const payload = buildDiscordFeedbackPanelMessagePayload();
  const firstButton = payload.components[0]?.components[0] as { emoji?: { id: string; name: string } } | undefined;

  assert.doesNotMatch(payload.embeds[0]?.description ?? "", /<:/);
  assert.equal(firstButton?.emoji, undefined);

  delete process.env.DISCORD_FEEDBACK_BUG_EMOJI_ID;
  delete process.env.DISCORD_FEEDBACK_FEATURE_EMOJI_ID;
});

test("discordMemberHasSetupPermission accepts administrator and manage guild bitfields", () => {
  assert.equal(discordMemberHasSetupPermission(String(BigInt(1) << BigInt(3))), true);
  assert.equal(discordMemberHasSetupPermission(String(BigInt(1) << BigInt(5))), true);
  assert.equal(discordMemberHasSetupPermission("0"), false);
});

test("discordMemberHasBugStatusPermission accepts moderator-level thread permissions", () => {
  assert.equal(discordMemberHasBugStatusPermission(String(BigInt(1) << BigInt(13))), true);
  assert.equal(discordMemberHasBugStatusPermission(String(BigInt(1) << BigInt(34))), true);
  assert.equal(discordMemberHasBugStatusPermission("0"), false);
});

test("discordMemberHasModerationPermission accepts administrator, manage guild, and manage roles", () => {
  assert.equal(discordMemberHasModerationPermission(String(BigInt(1) << BigInt(3))), true);
  assert.equal(discordMemberHasModerationPermission(String(BigInt(1) << BigInt(5))), true);
  assert.equal(discordMemberHasModerationPermission(String(BigInt(1) << BigInt(28))), true);
  assert.equal(discordMemberHasModerationPermission("0"), false);
});

test("buildDiscordGuildCommandsDefinition keeps Spotify Club slash commands staff-facing while the panel remains the public UX", () => {
  const commands = buildDiscordGuildCommandsDefinition();
  const feedback = commands.find((command) => command.name === "feedback");
  const feedbackStatus = commands.find((command) => command.name === "feedback-status");
  const feedbackCompletionReview = commands.find((command) => command.name === "feedback-completion-review");
  const feedbackWithdraw = commands.find((command) => command.name === "feedback-withdraw");
  const setupVerify = commands.find((command) => command.name === "setup-verify");
  const verifyCleanup = commands.find((command) => command.name === "verify-cleanup");
  const verifyLockdown = commands.find((command) => command.name === "verify-lockdown");
  const setupFeedback = commands.find((command) => command.name === "setup-feedback");
  const updateLatest = commands.find((command) => command.name === "update-latest");
  const updatePublish = commands.find((command) => command.name === "update-publish");
  const updateSkip = commands.find((command) => command.name === "update-skip");
  const setupSpotifyClub = commands.find((command) => command.name === "setup-spotify-club");
  const spotify = commands.find((command) => command.name === "spotify");
  const jamLobby = commands.find((command) => command.name === "jam-lobby");
  const jamQueue = commands.find((command) => command.name === "jam-queue");
  const purgatorySetup = commands.find((command) => command.name === "purgatory-setup");
  const warn = commands.find((command) => command.name === "warn");
  const warnings = commands.find((command) => command.name === "warnings");
  const warningClear = commands.find((command) => command.name === "warning-clear");
  const purgatory = commands.find((command) => command.name === "purgatory");
  const release = commands.find((command) => command.name === "release");
  const modLog = commands.find((command) => command.name === "mod-log");
  const serverInventory = commands.find((command) => command.name === "server-inventory");
  const feedbackStatusStatusOption = feedbackStatus?.options?.[1] as { choices?: Array<{ name: string; value: string }> } | undefined;
  const feedbackCompletionReviewDecisionOption = feedbackCompletionReview?.options?.[1] as { choices?: Array<{ name: string; value: string }> } | undefined;
  const warnSeverityOption = warn?.options?.[1] as { choices?: Array<{ name: string; value: string }> } | undefined;

  assert.equal(commands.length, 23);
  assert.ok(setupVerify);
  assert.equal(setupVerify?.default_member_permissions, String(BigInt(1) << BigInt(5)));
  assert.ok(verifyCleanup);
  assert.equal(verifyCleanup?.default_member_permissions, String(BigInt(1) << BigInt(5)));
  assert.ok(verifyLockdown);
  assert.equal(verifyLockdown?.default_member_permissions, String(BigInt(1) << BigInt(5)));
  assert.ok(setupFeedback);
  assert.equal(setupFeedback?.default_member_permissions, String(BigInt(1) << BigInt(5)));
  assert.ok(feedback);
  assert.equal(feedback?.default_member_permissions, String(BigInt(1) << BigInt(5)));
  assert.equal(feedback?.options, undefined);
  assert.ok(feedbackStatus);
  assert.equal(
    feedbackStatus?.default_member_permissions,
    String((BigInt(1) << BigInt(5)) | (BigInt(1) << BigInt(13)) | (BigInt(1) << BigInt(34))),
  );
  assert.equal(feedbackStatusStatusOption?.choices?.some((choice) => choice.value === "withdrawn"), true);
  assert.ok(feedbackCompletionReview);
  assert.equal(
    feedbackCompletionReview?.default_member_permissions,
    String((BigInt(1) << BigInt(5)) | (BigInt(1) << BigInt(13)) | (BigInt(1) << BigInt(34))),
  );
  assert.equal(feedbackCompletionReviewDecisionOption?.choices?.some((choice) => choice.value === "approved"), true);
  assert.ok(feedbackWithdraw);
  assert.equal(feedbackWithdraw?.default_member_permissions, String(BigInt(1) << BigInt(5)));
  assert.equal(feedbackWithdraw?.options?.[0]?.name, "report_id");
  assert.ok(updateLatest);
  assert.equal(
    updateLatest?.default_member_permissions,
    String((BigInt(1) << BigInt(5)) | (BigInt(1) << BigInt(13)) | (BigInt(1) << BigInt(34))),
  );
  assert.ok(updatePublish);
  assert.equal(updatePublish?.options?.[0]?.name, "draft_id");
  assert.ok(updateSkip);
  assert.equal(updateSkip?.options?.[1]?.name, "reason");
  assert.ok(setupSpotifyClub);
  assert.equal(setupSpotifyClub?.default_member_permissions, String(BigInt(1) << BigInt(5)));
  assert.ok(spotify);
  assert.equal(
    spotify?.default_member_permissions,
    String((BigInt(1) << BigInt(5)) | (BigInt(1) << BigInt(28))),
  );
  assert.deepEqual(spotify?.options?.map((option) => option.name), ["connect", "status", "disconnect"]);
  assert.equal(spotify?.options?.every((option) => option.type === 1), true);
  assert.ok(jamLobby);
  assert.equal(
    jamLobby?.default_member_permissions,
    String((BigInt(1) << BigInt(5)) | (BigInt(1) << BigInt(28))),
  );
  assert.deepEqual(jamLobby?.options?.map((option) => option.name), ["open", "close", "status"]);
  assert.ok(jamQueue);
  assert.equal(
    jamQueue?.default_member_permissions,
    String((BigInt(1) << BigInt(5)) | (BigInt(1) << BigInt(28))),
  );
  assert.deepEqual(jamQueue?.options?.map((option) => option.name), ["suggest", "list", "approve", "reject", "remove"]);
  assert.ok(purgatorySetup);
  assert.equal(
    purgatorySetup?.default_member_permissions,
    String((BigInt(1) << BigInt(5)) | (BigInt(1) << BigInt(28))),
  );
  assert.ok(warn);
  assert.equal(warn?.options?.[0]?.name, "user");
  assert.equal(warn?.options?.[1]?.name, "severity");
  assert.equal(warn?.options?.[2]?.name, "reason");
  assert.equal(warnSeverityOption?.choices?.some((choice) => choice.value === "critical"), true);
  assert.ok(warnings);
  assert.equal(warnings?.options?.[0]?.name, "user");
  assert.equal(warnings?.options?.[1]?.name, "limit");
  assert.ok(warningClear);
  assert.equal(warningClear?.options?.[0]?.name, "case_id");
  assert.equal(warningClear?.options?.[1]?.name, "reason");
  assert.ok(purgatory);
  assert.equal(purgatory?.options?.[0]?.name, "user");
  assert.equal(purgatory?.options?.[1]?.name, "reason");
  assert.equal(purgatory?.options?.[2]?.name, "duration");
  assert.ok(release);
  assert.equal(release?.options?.[1]?.name, "case_id");
  assert.equal(release?.options?.[2]?.name, "note");
  assert.ok(modLog);
  assert.equal(modLog?.options?.[1]?.name, "limit");
  assert.ok(serverInventory);
  assert.equal(
    serverInventory?.default_member_permissions,
    String((BigInt(1) << BigInt(5)) | (BigInt(1) << BigInt(28))),
  );
  assert.equal(commands.some((command) => command.name === "bug"), false);
  assert.equal(commands.some((command) => command.name === "jam"), false);
  assert.equal(commands.some((command) => command.name === "jam-start"), false);
  assert.equal(commands.some((command) => command.name === "routine-share"), false);
});
