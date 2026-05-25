import { normalizeDiscordFeedbackReportType } from "@/lib/discord/bug-reports";
import {
  DISCORD_INTERACTION_TYPE,
  extractDiscordFeedbackManageEditReportId,
  extractDiscordFeedbackManageWithdrawReportId,
  extractDiscordFeedbackUpdateReportIdFromModalCustomId,
  extractDiscordFeedbackWithdrawSelectedReportId,
  extractDiscordModalStringSelectValue,
  extractDiscordModalTextInputValue,
  FITNESS_FEEDBACK_COMMAND_NAME,
  FITNESS_FEEDBACK_COMPLETION_REVIEW_COMMAND_NAME,
  FITNESS_FEEDBACK_MANAGE_CANCEL_BUTTON_CUSTOM_ID,
  FITNESS_FEEDBACK_PANEL_SUBMIT_BUTTON_CUSTOM_ID,
  FITNESS_FEEDBACK_PANEL_SUBMIT_MODAL_CUSTOM_ID,
  FITNESS_FEEDBACK_PANEL_TYPE_INPUT_CUSTOM_ID,
  FITNESS_FEEDBACK_PANEL_UPDATE_BUTTON_CUSTOM_ID,
  FITNESS_FEEDBACK_REPORT_MODAL_CUSTOM_ID_PREFIX,
  FITNESS_FEEDBACK_SETUP_COMMAND_NAME,
  FITNESS_FEEDBACK_STATUS_COMMAND_NAME,
  FITNESS_FEEDBACK_SUBMIT_CREATE_BUTTON_CUSTOM_ID_PREFIX,
  FITNESS_FEEDBACK_SUBMIT_PICKER_SELECT_CUSTOM_ID,
  FITNESS_FEEDBACK_UPDATE_PICKER_BUTTON_CUSTOM_ID_PREFIX,
  FITNESS_FEEDBACK_UPDATE_PICKER_LOOKUP_BUTTON_CUSTOM_ID,
  FITNESS_FEEDBACK_UPDATE_PICKER_LOOKUP_MODAL_CUSTOM_ID,
  FITNESS_FEEDBACK_UPDATE_PICKER_SELECT_CUSTOM_ID,
  FITNESS_FEEDBACK_WITHDRAW_COMMAND_NAME,
  FITNESS_FEEDBACK_WITHDRAW_MODAL_CUSTOM_ID,
} from "@/lib/discord/interactions";
import type { DiscordInteraction } from "@/lib/discord/runtime/types";

type JsonResponse = (body: Record<string, unknown>, init?: ResponseInit) => Response;

type FeedbackDispatchArgs = {
  interaction: DiscordInteraction;
  jsonResponse: JsonResponse;
  buildDiscordFeedbackSubmitPickerResponse: () => Record<string, unknown>;
  buildDiscordFeedbackManageLookupModalResponse: () => Record<string, unknown>;
  buildDiscordEphemeralMessageResponse: (content: string) => Record<string, unknown>;
  handleBugStatusInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleFeedbackCompletionReviewInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleFeedbackWithdrawInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleSetupFeedbackInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleFeedbackSubmitPickerSelection: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleFeedbackSubmitCreateButton: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  buildFeedbackUpdatePickerOpenResponse: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleFeedbackUpdatePickerButton: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleFeedbackUpdatePickerSelection: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleFeedbackManageEditButton: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleFeedbackManageWithdrawButton: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleDeferredFeedbackCreateModalSubmit: (
    interaction: DiscordInteraction,
    reportType?: "bug" | "feature",
  ) => Promise<Response> | Response;
  handleFeedbackManageLookupModalSubmit: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleFeedbackUpdateModalSubmit: (interaction: DiscordInteraction) => Promise<Response> | Response;
  handleFeedbackWithdrawModalSubmit: (interaction: DiscordInteraction) => Promise<Response> | Response;
  handleFeedbackWithdrawSelectedModalSubmit: (interaction: DiscordInteraction) => Promise<Response> | Response;
};

export async function dispatchFeedbackInteraction(args: FeedbackDispatchArgs): Promise<Response | null> {
  const { interaction } = args;

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && interaction.data?.name === FITNESS_FEEDBACK_COMMAND_NAME
  ) {
    return args.jsonResponse(args.buildDiscordFeedbackSubmitPickerResponse());
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && interaction.data?.name === FITNESS_FEEDBACK_STATUS_COMMAND_NAME
  ) {
    return args.jsonResponse(await args.handleBugStatusInteraction(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && interaction.data?.name === FITNESS_FEEDBACK_COMPLETION_REVIEW_COMMAND_NAME
  ) {
    return args.jsonResponse(await args.handleFeedbackCompletionReviewInteraction(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && interaction.data?.name === FITNESS_FEEDBACK_WITHDRAW_COMMAND_NAME
  ) {
    return args.jsonResponse(await args.handleFeedbackWithdrawInteraction(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && interaction.data?.name === FITNESS_FEEDBACK_SETUP_COMMAND_NAME
  ) {
    return args.jsonResponse(await args.handleSetupFeedbackInteraction(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
    && interaction.data?.custom_id === FITNESS_FEEDBACK_PANEL_SUBMIT_BUTTON_CUSTOM_ID
  ) {
    return args.jsonResponse(args.buildDiscordFeedbackSubmitPickerResponse());
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
    && interaction.data?.custom_id === FITNESS_FEEDBACK_SUBMIT_PICKER_SELECT_CUSTOM_ID
  ) {
    return args.jsonResponse(await args.handleFeedbackSubmitPickerSelection(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
    && typeof interaction.data?.custom_id === "string"
    && interaction.data.custom_id.startsWith(`${FITNESS_FEEDBACK_SUBMIT_CREATE_BUTTON_CUSTOM_ID_PREFIX}:`)
  ) {
    return args.jsonResponse(await args.handleFeedbackSubmitCreateButton(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
    && interaction.data?.custom_id === FITNESS_FEEDBACK_PANEL_UPDATE_BUTTON_CUSTOM_ID
  ) {
    return args.jsonResponse(await args.buildFeedbackUpdatePickerOpenResponse(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
    && typeof interaction.data?.custom_id === "string"
    && interaction.data.custom_id.startsWith(`${FITNESS_FEEDBACK_UPDATE_PICKER_BUTTON_CUSTOM_ID_PREFIX}:`)
  ) {
    return args.jsonResponse(await args.handleFeedbackUpdatePickerButton(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
    && interaction.data?.custom_id === FITNESS_FEEDBACK_UPDATE_PICKER_SELECT_CUSTOM_ID
  ) {
    return args.jsonResponse(await args.handleFeedbackUpdatePickerSelection(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
    && interaction.data?.custom_id === FITNESS_FEEDBACK_UPDATE_PICKER_LOOKUP_BUTTON_CUSTOM_ID
  ) {
    return args.jsonResponse(args.buildDiscordFeedbackManageLookupModalResponse());
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
    && typeof interaction.data?.custom_id === "string"
    && extractDiscordFeedbackManageEditReportId(interaction.data.custom_id)
  ) {
    return args.jsonResponse(await args.handleFeedbackManageEditButton(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
    && typeof interaction.data?.custom_id === "string"
    && extractDiscordFeedbackManageWithdrawReportId(interaction.data.custom_id)
  ) {
    return args.jsonResponse(await args.handleFeedbackManageWithdrawButton(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
    && interaction.data?.custom_id === FITNESS_FEEDBACK_MANAGE_CANCEL_BUTTON_CUSTOM_ID
  ) {
    return args.jsonResponse(args.buildDiscordEphemeralMessageResponse("Feedback action cancelled."));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
    && typeof interaction.data?.custom_id === "string"
    && interaction.data.custom_id.startsWith(`${FITNESS_FEEDBACK_REPORT_MODAL_CUSTOM_ID_PREFIX}:`)
  ) {
    return args.handleDeferredFeedbackCreateModalSubmit(interaction);
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
    && interaction.data?.custom_id === FITNESS_FEEDBACK_PANEL_SUBMIT_MODAL_CUSTOM_ID
  ) {
    const rawReportType = extractDiscordModalStringSelectValue(interaction.data?.components, FITNESS_FEEDBACK_PANEL_TYPE_INPUT_CUSTOM_ID)
      ?? extractDiscordModalTextInputValue(interaction.data?.components, FITNESS_FEEDBACK_PANEL_TYPE_INPUT_CUSTOM_ID);
    const reportType = normalizeDiscordFeedbackReportType(rawReportType);

    if (reportType === "bug" || reportType === "feature") {
      return args.handleDeferredFeedbackCreateModalSubmit(interaction, reportType);
    }

    if (rawReportType) {
      return args.jsonResponse(args.buildDiscordEphemeralMessageResponse("Choose Bug or Feature for the feedback type."), { status: 400 });
    }

    return args.handleDeferredFeedbackCreateModalSubmit(interaction, "bug");
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
    && interaction.data?.custom_id === FITNESS_FEEDBACK_UPDATE_PICKER_LOOKUP_MODAL_CUSTOM_ID
  ) {
    return args.jsonResponse(await args.handleFeedbackManageLookupModalSubmit(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
    && typeof interaction.data?.custom_id === "string"
    && extractDiscordFeedbackUpdateReportIdFromModalCustomId(interaction.data.custom_id)
  ) {
    return args.handleFeedbackUpdateModalSubmit(interaction);
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
    && interaction.data?.custom_id === FITNESS_FEEDBACK_WITHDRAW_MODAL_CUSTOM_ID
  ) {
    return args.handleFeedbackWithdrawModalSubmit(interaction);
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
    && typeof interaction.data?.custom_id === "string"
    && extractDiscordFeedbackWithdrawSelectedReportId(interaction.data.custom_id)
  ) {
    return args.handleFeedbackWithdrawSelectedModalSubmit(interaction);
  }

  return null;
}
