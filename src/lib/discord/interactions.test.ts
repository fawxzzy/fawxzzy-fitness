import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscordDeferredEphemeralMessageResponse,
  buildDiscordFeedbackPanelMessagePayload,
  buildDiscordFeedbackPanelSubmitModalResponse,
  buildDiscordFeedbackReportModalResponse,
  buildDiscordFeedbackUpdateModalResponse,
  buildDiscordFeedbackWithdrawModalResponse,
  buildDiscordUpdatePublishModalResponse,
  buildDiscordGuildCommandsDefinition,
  buildDiscordPongResponse,
  buildDiscordVerifyModalResponse,
  buildDiscordVerifyMessagePayload,
  discordMemberHasBugStatusPermission,
  discordMemberHasModerationPermission,
  discordMessageHasFeedbackPanel,
  discordMemberHasSetupPermission,
  extractDiscordCommandIntegerOption,
  extractDiscordCommandStringOption,
  extractDiscordCommandUserOption,
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
  assert.equal(bug.data.components[3]?.label, "Description / what happened");
  assert.equal(bugOptions?.[0]?.default, true);
  assert.equal(feature.data.custom_id, "fitness_feedback_report_modal:feature");
  assert.equal(feature.data.title, "Suggest a feature");
  assert.equal(feature.data.components[1]?.label, "Title");
  assert.equal(feature.data.components[3]?.label, "Description / what happened");
  assert.equal(featureOptions?.[1]?.default, true);
});

test("buildDiscordFeedbackPanelMessagePayload includes the persistent panel buttons", () => {
  const payload = buildDiscordFeedbackPanelMessagePayload();

  assert.equal(payload.embeds[0]?.title, "Feedback Actions");
  assert.match(payload.embeds[0]?.description ?? "", /submit, update, or withdraw feedback/i);
  assert.deepEqual(
    payload.components[0]?.components?.map((component) => component.custom_id),
    [
      "fitness_feedback_submit_open",
      "fitness_feedback_update_open",
      "fitness_feedback_withdraw_open",
    ],
  );
  assert.deepEqual(
    payload.components[0]?.components?.map((component) => component.label),
    ["Submit", "Add Update", "Withdraw"],
  );
});

test("discordMessageHasFeedbackPanel detects the feedback panel action row", () => {
  assert.equal(discordMessageHasFeedbackPanel(buildDiscordFeedbackPanelMessagePayload()), true);
  assert.equal(discordMessageHasFeedbackPanel(buildDiscordVerifyMessagePayload()), false);
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

test("resolveDiscordVerifyMessageBody converts escaped newlines into rendered lines", () => {
  assert.equal(
    resolveDiscordVerifyMessageBody("Line 1\\nLine 2"),
    "Line 1\nLine 2",
  );
});

test("resolveDiscordVerifyMessageBody falls back to the updated Discord Connector instructions", () => {
  assert.equal(
    resolveDiscordVerifyMessageBody(null),
    [
      "To unlock the server:",
      "",
      "1. Sign into Fawxzzy Fitness.",
      "2. Go to Settings → Account → Discord Connector.",
      "3. Generate your Discord verification token.",
      "4. Click Verify below and paste the token.",
      "",
      "Fitness login:",
      "https://fawxzzy-fitness-local.vercel.app/login",
    ].join("\n"),
  );
});

test("buildDiscordVerifyMessagePayload includes the verify button", () => {
  const payload = buildDiscordVerifyMessagePayload();

  assert.equal(payload.components[0]?.components[0]?.custom_id, "fitness_verify_open");
});

test("feedback panel button modals expose submit, update, and withdraw forms", () => {
  const submit = buildDiscordFeedbackPanelSubmitModalResponse();
  const update = buildDiscordFeedbackUpdateModalResponse();
  const withdraw = buildDiscordFeedbackWithdrawModalResponse();

  assert.equal(submit.data.custom_id, "fitness_feedback_submit_modal");
  assert.equal(submit.data.components[0]?.component?.custom_id, "feedback_type");
  assert.equal(submit.data.components[1]?.label, "Title");
  assert.equal(submit.data.components[3]?.label, "Details");
  assert.equal(submit.data.components[4]?.label, "Attachment");
  assert.equal(submit.data.components[4]?.component?.custom_id, "feedback_attachment");
  assert.equal(submit.data.components[4]?.component?.max_values, 3);
  assert.equal(update.data.custom_id, "fitness_feedback_update_modal");
  assert.equal(update.data.components[0]?.components[0]?.custom_id, "feedback_update_report_id");
  assert.equal(withdraw.data.custom_id, "fitness_feedback_withdraw_modal");
  assert.equal(withdraw.data.components[1]?.components[0]?.custom_id, "feedback_withdraw_note");
});

test("feedback submit modal keeps panel buttons text-only while select options use validated emoji payloads", () => {
  const emojis = {
    Bug: { id: "1505007702924066916", name: "Bug" },
    Feature: { id: "1505007651308703877", name: "Feature" },
  };

  const panelPayload = buildDiscordFeedbackPanelMessagePayload({ emojis });
  const submitModal = buildDiscordFeedbackPanelSubmitModalResponse({ emojis });
  const options = (submitModal.data.components[0]?.component as { options?: Array<{ emoji?: { id: string; name: string } }> } | undefined)?.options;

  assert.equal(panelPayload.components[0]?.components[0]?.emoji, undefined);
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

test("feedback panel payload stays text-only even when custom emoji env vars are set", () => {
  process.env.DISCORD_FEEDBACK_BUG_EMOJI_ID = "1505007702924068916";
  process.env.DISCORD_FEEDBACK_FEATURE_EMOJI_ID = "1505007651308703877";

  const payload = buildDiscordFeedbackPanelMessagePayload();

  assert.doesNotMatch(payload.embeds[0]?.description ?? "", /<:/);
  assert.equal(payload.components[0]?.components[0]?.emoji, undefined);

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

test("buildDiscordGuildCommandsDefinition includes setup commands, feedback commands, and staff permissions", () => {
  const commands = buildDiscordGuildCommandsDefinition();
  const feedback = commands.find((command) => command.name === "feedback");
  const feedbackStatus = commands.find((command) => command.name === "feedback-status");
  const feedbackWithdraw = commands.find((command) => command.name === "feedback-withdraw");
  const setupVerify = commands.find((command) => command.name === "setup-verify");
  const setupFeedback = commands.find((command) => command.name === "setup-feedback");
  const updateLatest = commands.find((command) => command.name === "update-latest");
  const updatePublish = commands.find((command) => command.name === "update-publish");
  const updateSkip = commands.find((command) => command.name === "update-skip");
  const purgatorySetup = commands.find((command) => command.name === "purgatory-setup");
  const purgatory = commands.find((command) => command.name === "purgatory");
  const release = commands.find((command) => command.name === "release");
  const modLog = commands.find((command) => command.name === "mod-log");

  assert.equal(commands.length, 12);
  assert.ok(setupVerify);
  assert.equal(setupVerify?.default_member_permissions, String(BigInt(1) << BigInt(5)));
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
  assert.equal(feedbackStatus?.options?.[1]?.choices?.some((choice) => choice.value === "withdrawn"), true);
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
  assert.ok(purgatorySetup);
  assert.equal(
    purgatorySetup?.default_member_permissions,
    String((BigInt(1) << BigInt(5)) | (BigInt(1) << BigInt(28))),
  );
  assert.ok(purgatory);
  assert.equal(purgatory?.options?.[0]?.name, "user");
  assert.equal(purgatory?.options?.[1]?.name, "reason");
  assert.equal(purgatory?.options?.[2]?.name, "duration");
  assert.ok(release);
  assert.equal(release?.options?.[1]?.name, "case_id");
  assert.equal(release?.options?.[2]?.name, "note");
  assert.ok(modLog);
  assert.equal(modLog?.options?.[1]?.name, "limit");
  assert.equal(commands.some((command) => command.name === "bug"), false);
  assert.equal(commands.some((command) => command.name === "routine-share"), false);
});
