import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscordFeedbackPanelMessagePayload,
  buildDiscordFeedbackPanelSubmitModalResponse,
  buildDiscordFeedbackReportModalResponse,
  buildDiscordFeedbackUpdateModalResponse,
  buildDiscordFeedbackWithdrawModalResponse,
  buildDiscordGuildCommandsDefinition,
  buildDiscordPongResponse,
  buildDiscordVerifyModalResponse,
  buildDiscordVerifyMessagePayload,
  discordMemberHasBugStatusPermission,
  discordMessageHasFeedbackPanel,
  discordMemberHasSetupPermission,
  extractDiscordCommandStringOption,
  extractDiscordModalTextInputValue,
  resolveDiscordFeedbackReportTypeFromModalCustomId,
  resolveDiscordVerifyMessageBody,
} from "./interactions.ts";

test("buildDiscordPongResponse returns Discord PONG type", () => {
  assert.deepEqual(buildDiscordPongResponse(), { type: 1 });
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

  assert.equal(bug.data.custom_id, "fitness_feedback_report_modal:bug");
  assert.equal(bug.data.title, "Report a bug");
  assert.equal(feature.data.custom_id, "fitness_feedback_report_modal:feature");
  assert.equal(feature.data.title, "Suggest a feature");
});

test("buildDiscordFeedbackPanelMessagePayload includes the persistent panel buttons", () => {
  const payload = buildDiscordFeedbackPanelMessagePayload();

  assert.equal(payload.embeds[0]?.title, "Fawxzzy Feedback");
  assert.match(payload.embeds[0]?.description ?? "", /report a bug or suggest a feature/i);
  assert.deepEqual(
    payload.components[0]?.components?.map((component) => component.custom_id),
    [
      "fitness_feedback_submit_open",
      "fitness_feedback_update_open",
      "fitness_feedback_withdraw_open",
    ],
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

test("extractDiscordCommandStringOption reads string slash-command options", () => {
  const value = extractDiscordCommandStringOption([
    { type: 3, name: "report_id", value: "abc12345" },
    { type: 3, name: "status", value: "confirmed" },
  ], "status");

  assert.equal(value, "confirmed");
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
  assert.equal(submit.data.components[0]?.components[0]?.custom_id, "feedback_type");
  assert.equal(submit.data.components[0]?.components[0]?.label, "Feedback type");
  assert.equal(update.data.custom_id, "fitness_feedback_update_modal");
  assert.equal(update.data.components[0]?.components[0]?.custom_id, "feedback_update_report_id");
  assert.equal(withdraw.data.custom_id, "fitness_feedback_withdraw_modal");
  assert.equal(withdraw.data.components[1]?.components[0]?.custom_id, "feedback_withdraw_note");
});

test("feedback panel payload includes configured custom emoji surfaces when available", () => {
  process.env.DISCORD_FEEDBACK_BUG_EMOJI_ID = "1505007702924068916";
  process.env.DISCORD_FEEDBACK_FEATURE_EMOJI_ID = "1505007651308703877";

  const payload = buildDiscordFeedbackPanelMessagePayload();

  assert.match(payload.embeds[0]?.description ?? "", /<:Bug:1505007702924068916>/);
  assert.match(payload.embeds[0]?.description ?? "", /<:Feature:1505007651308703877>/);
  assert.deepEqual(payload.components[0]?.components[0]?.emoji, {
    id: "1505007702924068916",
    name: "Bug",
  });

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

test("buildDiscordGuildCommandsDefinition includes setup commands, feedback commands, and staff permissions", () => {
  const commands = buildDiscordGuildCommandsDefinition();
  const feedback = commands.find((command) => command.name === "feedback");
  const feedbackStatus = commands.find((command) => command.name === "feedback-status");
  const feedbackWithdraw = commands.find((command) => command.name === "feedback-withdraw");
  const setupVerify = commands.find((command) => command.name === "setup-verify");
  const setupFeedback = commands.find((command) => command.name === "setup-feedback");

  assert.equal(commands.length, 5);
  assert.ok(setupVerify);
  assert.equal(setupVerify?.default_member_permissions, String(BigInt(1) << BigInt(5)));
  assert.ok(setupFeedback);
  assert.equal(setupFeedback?.default_member_permissions, String(BigInt(1) << BigInt(5)));
  assert.ok(feedback);
  assert.equal(feedback?.options, undefined);
  assert.ok(feedbackStatus);
  assert.equal(
    feedbackStatus?.default_member_permissions,
    String((BigInt(1) << BigInt(5)) | (BigInt(1) << BigInt(13)) | (BigInt(1) << BigInt(34))),
  );
  assert.equal(feedbackStatus?.options?.[1]?.choices?.some((choice) => choice.value === "withdrawn"), true);
  assert.ok(feedbackWithdraw);
  assert.equal(feedbackWithdraw?.options?.[0]?.name, "report_id");
});
