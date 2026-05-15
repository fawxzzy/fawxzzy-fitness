import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscordBugReportModalResponse,
  buildDiscordFeedbackReportModalResponse,
  buildDiscordGuildCommandsDefinition,
  buildDiscordPongResponse,
  buildDiscordVerifyModalResponse,
  buildDiscordVerifyMessagePayload,
  discordMemberHasBugStatusPermission,
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
  const feat = buildDiscordFeedbackReportModalResponse("feat");
  const fix = buildDiscordFeedbackReportModalResponse("fix");

  assert.equal(bug.data.custom_id, "fitness_feedback_report_modal:bug");
  assert.equal(bug.data.title, "Report a bug");
  assert.equal(feat.data.title, "Suggest a feature");
  assert.equal(fix.data.title, "Suggest a fix");
});

test("buildDiscordBugReportModalResponse keeps the bug alias modal custom id", () => {
  const response = buildDiscordBugReportModalResponse();

  assert.equal(response.type, 9);
  assert.equal(response.data.custom_id, "fitness_bug_report_modal");
  assert.equal(response.data.components[0]?.components[0]?.custom_id, "bug_summary");
});

test("resolveDiscordFeedbackReportTypeFromModalCustomId supports feedback modals and bug alias", () => {
  assert.equal(resolveDiscordFeedbackReportTypeFromModalCustomId("fitness_feedback_report_modal:feat"), "feat");
  assert.equal(resolveDiscordFeedbackReportTypeFromModalCustomId("fitness_bug_report_modal"), "bug");
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

test("buildDiscordVerifyMessagePayload includes the verify button", () => {
  const payload = buildDiscordVerifyMessagePayload();

  assert.equal(payload.components[0]?.components[0]?.custom_id, "fitness_verify_open");
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

test("buildDiscordGuildCommandsDefinition includes feedback, feedback-status, feedback-withdraw, and bug aliases", () => {
  const commands = buildDiscordGuildCommandsDefinition();
  const feedback = commands.find((command) => command.name === "feedback");
  const feedbackStatus = commands.find((command) => command.name === "feedback-status");
  const feedbackWithdraw = commands.find((command) => command.name === "feedback-withdraw");
  const bugAlias = commands.find((command) => command.name === "bug");
  const bugStatusAlias = commands.find((command) => command.name === "bug-status");

  assert.ok(feedback);
  assert.equal(feedback?.options?.[0]?.name, "type");
  assert.equal(feedback?.options?.[0]?.choices?.some((choice) => choice.value === "feat"), true);
  assert.ok(feedbackStatus);
  assert.equal(feedbackStatus?.options?.[1]?.choices?.some((choice) => choice.value === "withdrawn"), true);
  assert.ok(feedbackWithdraw);
  assert.equal(feedbackWithdraw?.options?.[0]?.name, "report_id");
  assert.ok(bugAlias);
  assert.ok(bugStatusAlias);
});
