import { randomUUID } from "node:crypto";

type DiscordOsFeedbackReportType = "bug" | "feature";

export type DiscordOsFeedbackTransferConfig = {
  enabled: boolean;
  mode: "fitness-primary" | "discordos-primary";
  endpointUrl: string | null;
  blockedReasons: string[];
};

type SubmitDiscordOsFeedbackTransferArgs = {
  interactionId: string | null;
  reportType: DiscordOsFeedbackReportType;
  reporterDiscordUserId: string;
  reporterUserKind?: "human" | "automation" | "unknown";
  summary: string | null;
  area: string | null;
  details: string | null;
  endpointUrl: string;
  fetchImpl?: typeof fetch;
};

function optionalEnv(name: string, env: Record<string, string | undefined>): string | null {
  const value = env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function cleanUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeMode(value: string | null): DiscordOsFeedbackTransferConfig["mode"] {
  return value === "discordos-primary" ? "discordos-primary" : "fitness-primary";
}

function normalizeTitlePart(value: string | null, fallback: string): string {
  const normalized = value?.trim().replace(/\s+/g, " ");
  return normalized && normalized.length > 0 ? normalized : fallback;
}

export function getDiscordOsFeedbackTransferConfig(
  env: Record<string, string | undefined> = process.env,
): DiscordOsFeedbackTransferConfig {
  const mode = normalizeMode(optionalEnv("DISCORDOS_FEEDBACK_TRANSFER_MODE", env));
  const rawEndpoint =
    optionalEnv("DISCORDOS_FEEDBACK_TRANSFER_ENDPOINT_URL", env)
    ?? optionalEnv("DISCORDOS_FEEDBACK_PERSIST_ENDPOINT_URL", env);
  const endpointUrl = rawEndpoint ? `${cleanUrl(rawEndpoint)}` : null;
  const blockedReasons: string[] = [];

  if (mode === "discordos-primary" && endpointUrl === null) {
    blockedReasons.push("missing_discordos_feedback_transfer_endpoint_url");
  }

  return {
    enabled: mode === "discordos-primary" && blockedReasons.length === 0,
    mode,
    endpointUrl,
    blockedReasons,
  };
}

export function buildDiscordOsFeedbackTransferPayload(args: Omit<SubmitDiscordOsFeedbackTransferArgs, "endpointUrl" | "fetchImpl">) {
  const reportIdSource = args.interactionId?.trim() || randomUUID();
  const summary = normalizeTitlePart(args.summary, "Feedback report");
  const area = normalizeTitlePart(args.area, "Fitness");

  return {
    reportId: `fitness-live-transfer-${reportIdSource}`,
    reportType: args.reportType,
    reporterDiscordUserId: args.reporterDiscordUserId,
    reporterUserKind: args.reporterUserKind ?? "human",
    forumTitle: `${args.reportType === "feature" ? "Feature" : "Bug"}: ${area} - ${summary}`.slice(0, 180),
    statusNote: args.details?.trim().slice(0, 500) || null,
  };
}

export async function submitDiscordOsFeedbackTransfer(args: SubmitDiscordOsFeedbackTransferArgs): Promise<{
  ok: true;
  status: number;
  payload: unknown;
} | {
  ok: false;
  status: number | null;
  code: string;
}> {
  const fetchImpl = args.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(args.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(buildDiscordOsFeedbackTransferPayload(args)),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || payload?.ok !== true) {
      return {
        ok: false,
        status: response.status,
        code: typeof payload?.error === "string" ? payload.error : "DISCORDOS_FEEDBACK_TRANSFER_FAILED",
      };
    }

    return {
      ok: true,
      status: response.status,
      payload,
    };
  } catch {
    return {
      ok: false,
      status: null,
      code: "DISCORDOS_FEEDBACK_TRANSFER_UNREACHABLE",
    };
  }
}
