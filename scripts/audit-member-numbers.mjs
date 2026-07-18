#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { parseDotenvFile, resolveEnvFilePath } from "./env-file.mjs";
import { summarizeMemberNumberSafety } from "./member-number-safety-core.mjs";

const AUTOMATION_SIGNAL_PATTERN = /(^|[^a-z0-9])(codex|test|qa|example|preview|local)([^a-z0-9]|$)/i;
const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const FALLBACK_SUPABASE_URL_ENV = "SUPABASE_URL";
const SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";
const FITNESS_ZAC_EMAIL_ENV = "FITNESS_ZAC_EMAIL";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const envPath = resolveEnvFilePath(repoRoot);
const fileEnv = parseDotenvFile(envPath);
const explicitEnvFileOverride = Boolean(process.env.FITNESS_ENV_FILE?.trim());

for (const [key, value] of Object.entries(fileEnv)) {
  if (explicitEnvFileOverride || !process.env[key]) {
    process.env[key] = value;
  }
}

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}. Set it in ${envPath} or the current shell.`);
  }

  return value;
}

function getOptionalEnv(name) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function getSupabaseUrl() {
  const value = process.env[SUPABASE_URL_ENV]?.trim() || process.env[FALLBACK_SUPABASE_URL_ENV]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${SUPABASE_URL_ENV} or ${FALLBACK_SUPABASE_URL_ENV}. Set it in ${envPath} or the current shell.`);
  }

  return value;
}

function createServiceClient() {
  return createClient(getSupabaseUrl(), getRequiredEnv(SUPABASE_SERVICE_ROLE_KEY_ENV), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function maskEmail(email) {
  if (!email || !email.includes("@")) {
    return "(missing)";
  }

  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "(invalid)";
  }

  const visibleLocal = localPart.slice(0, Math.min(localPart.length, 2));
  const maskedLocal = `${visibleLocal}${"*".repeat(Math.max(localPart.length - visibleLocal.length, 1))}`;
  const domainParts = domain.split(".");
  const domainName = domainParts.shift() ?? "";
  const maskedDomainName = domainName.length <= 2
    ? `${domainName[0] ?? "*"}*`
    : `${domainName.slice(0, 2)}${"*".repeat(domainName.length - 2)}`;

  return `${maskedLocal}@${[maskedDomainName, ...domainParts].filter(Boolean).join(".")}`;
}

function maskDiscordUserId(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "(missing)";
  }

  if (normalized.length <= 4) {
    return `${"*".repeat(Math.max(normalized.length - 1, 0))}${normalized.slice(-1)}`;
  }

  return `${"*".repeat(normalized.length - 4)}${normalized.slice(-4)}`;
}

function collectAutomationSignals(user) {
  const reasons = [];
  const email = String(user?.email ?? "").trim().toLowerCase();
  const metadataValues = [
    user?.user_metadata?.account_kind,
    user?.app_metadata?.account_kind,
    user?.user_metadata?.display_name,
    user?.user_metadata?.full_name,
    user?.user_metadata?.name,
    user?.app_metadata?.owner,
    user?.app_metadata?.purpose,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  if ((user?.user_metadata?.account_kind ?? "").toString().toLowerCase() === "automation") {
    reasons.push("user_metadata.account_kind=automation");
  }

  if ((user?.app_metadata?.account_kind ?? "").toString().toLowerCase() === "automation") {
    reasons.push("app_metadata.account_kind=automation");
  }

  if (AUTOMATION_SIGNAL_PATTERN.test(email)) {
    reasons.push("email matches automation/test pattern");
  }

  for (const value of metadataValues) {
    if (AUTOMATION_SIGNAL_PATTERN.test(value)) {
      reasons.push(`metadata matches automation/test pattern (${value})`);
    }
  }

  return Array.from(new Set(reasons));
}

async function listAllAuthUsers(adminClient) {
  const users = [];
  let page = 1;

  while (page) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw new Error(`Unable to list auth users: ${error.message}`);
    }

    users.push(...(data?.users ?? []));
    page = data?.nextPage ?? 0;
  }

  return users;
}

function printList(label, rows) {
  console.log(`${label}: ${rows.length}`);
  if (rows.length === 0) {
    console.log("  none");
    return;
  }

  for (const row of rows) {
    console.log(`  - ${row}`);
  }
}

async function loadDiscordMemberLinks(client) {
  const { data, error } = await client
    .from("discord_member_links")
    .select("id, fitness_user_id, discord_user_id, user_number, user_kind, nickname_sync_status, updated_at");

  if (error) {
    if (/does not exist|Could not find the table|schema cache/i.test(error.message)) {
      return { ok: false, reason: error.message };
    }

    throw new Error(`Unable to load discord_member_links: ${error.message}`);
  }

  return { ok: true, rows: data ?? [] };
}

async function main() {
  const client = createServiceClient();
  const zacEmail = getOptionalEnv(FITNESS_ZAC_EMAIL_ENV)?.toLowerCase() ?? null;
  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("id, user_number, user_kind, user_number_assigned_at")
    .order("user_number", { ascending: true, nullsFirst: true });

  if (profilesError) {
    throw new Error(`Unable to load profiles: ${profilesError.message}`);
  }

  let authUsers = [];
  let authUsersError = null;

  try {
    authUsers = await listAllAuthUsers(client);
  } catch (error) {
    authUsersError = error instanceof Error ? error.message : String(error);
  }

  const discordLinksResult = await loadDiscordMemberLinks(client);
  const profileRows = profiles ?? [];
  const authUsersById = new Map(authUsers.map((user) => [user.id, user]));
  const profileById = new Map(profileRows.map((profile) => [profile.id, profile]));
  const memberNumberSafety = summarizeMemberNumberSafety(profileRows);
  const numberedHumanProfiles = profileRows.filter((profile) => profile.user_kind === "human" && profile.user_number !== null);
  const automationProfiles = profileRows.filter((profile) => profile.user_kind === "automation");
  const unknownProfiles = profileRows.filter((profile) => profile.user_kind === "unknown");
  const zeroProfiles = profileRows.filter((profile) => profile.user_number === 0);
  const positiveGaps = memberNumberSafety.positiveGaps;
  const duplicateNumbers = memberNumberSafety.duplicateNumbers
    .map(({ number, count }) => `#${number} appears ${count} times`);

  const suspiciousNumberedProfiles = authUsersError
    ? []
    : numberedHumanProfiles.flatMap((profile) => {
        const authUser = authUsersById.get(profile.id);
        const reasons = collectAutomationSignals(authUser);
        if (reasons.length === 0) {
          return [];
        }

        return [`${profile.id} -> #${profile.user_number} -> ${maskEmail(authUser?.email ?? "")} -> ${reasons.join("; ")}`];
      });

  const automationProfilesWithNumbers = automationProfiles
    .filter((profile) => profile.user_number !== null)
    .map((profile) => `${profile.id} -> #${profile.user_number}`);

  const nonZacZeroProfiles = authUsersError || !zacEmail
    ? []
    : zeroProfiles.filter((profile) => {
        const authUser = authUsersById.get(profile.id);
        return String(authUser?.email ?? "").trim().toLowerCase() !== zacEmail;
      }).map((profile) => {
        const authUser = authUsersById.get(profile.id);
        return `${profile.id} -> ${maskEmail(authUser?.email ?? "")}`;
      });

  const staleDiscordLinkRows = !discordLinksResult.ok
    ? []
    : discordLinksResult.rows.flatMap((link) => {
        const profile = profileById.get(link.fitness_user_id);
        if (!profile) {
          return [`link ${link.id} -> discord ${maskDiscordUserId(link.discord_user_id)} -> profile missing`];
        }

        const profileNumber = typeof profile.user_number === "number" ? profile.user_number : null;
        const profileKind = profile.user_kind ?? "unknown";
        if (link.user_number === profileNumber && link.user_kind === profileKind) {
          return [];
        }

        return [
          `link ${link.id} -> discord ${maskDiscordUserId(link.discord_user_id)} -> stored #${link.user_number ?? "null"} (${link.user_kind}) vs profile #${profileNumber ?? "null"} (${profileKind})`,
        ];
      });

  const problems = [];
  if (duplicateNumbers.length > 0) {
    problems.push(...duplicateNumbers.map((entry) => `Duplicate number: ${entry}`));
  }
  if (memberNumberSafety.negativeHumanNumbers.length > 0) {
    problems.push(`Negative human member numbers detected: ${memberNumberSafety.negativeHumanNumbers.join(", ")}`);
  }
  if (zeroProfiles.length > 1) {
    problems.push(`More than one #0 profile exists (${zeroProfiles.length}).`);
  }
  if (nonZacZeroProfiles.length > 0) {
    problems.push(...nonZacZeroProfiles.map((entry) => `Non-Zac #0 profile: ${entry}`));
  }
  if (automationProfilesWithNumbers.length > 0) {
    problems.push(...automationProfilesWithNumbers.map((entry) => `Automation profile still has a number: ${entry}`));
  }
  if (memberNumberSafety.reservedNumberHighWaterError) {
    problems.push(
      `Reserved member-number high-water is invalid (${memberNumberSafety.reservedNumberHighWaterError}); minimum safe next number is unavailable.`,
    );
  }

  const warnings = [];
  if (authUsersError) {
    warnings.push(`Auth-user audit unavailable: ${authUsersError}`);
  }
  if (!zacEmail) {
    warnings.push(`${FITNESS_ZAC_EMAIL_ENV} is not set, so #0 ownership could not be validated against Zac email.`);
  }
  if (!discordLinksResult.ok) {
    warnings.push(`discord_member_links audit unavailable: ${discordLinksResult.reason}`);
  }
  if (suspiciousNumberedProfiles.length > 0) {
    warnings.push(`Suspicious numbered profiles detected: ${suspiciousNumberedProfiles.length}`);
  }
  if (staleDiscordLinkRows.length > 0) {
    warnings.push(`discord_member_links rows with stale user_number/user_kind snapshots: ${staleDiscordLinkRows.length}`);
  }

  console.log("Member number audit");
  console.log(`Env file: ${envPath}`);
  console.log("Immutable numbering expected: deletions leave permanent positive gaps.");
  console.log("#0 is reserved; every assigned number is unique and never reused.");
  console.log(`Human numbered count: ${numberedHumanProfiles.length}`);
  console.log(`Automation count: ${automationProfiles.length}`);
  console.log(`Unknown count: ${unknownProfiles.length}`);
  console.log(`Max reserved user_number: ${memberNumberSafety.maxReservedNumber ?? "none"}`);
  console.log(`Minimum safe next number: ${memberNumberSafety.minimumSafeNextNumber ?? "unavailable (fail-closed)"}`);
  console.log(`#0 profile count: ${zeroProfiles.length}`);
  console.log(`Permanent positive gap count: ${memberNumberSafety.positiveGapCount ?? "unavailable"}`);
  console.log(`Permanent positive gap evidence truncated: ${memberNumberSafety.positiveGapsTruncated ? "yes" : "no"}`);
  console.log(`Permanent positive gap evidence: ${positiveGaps.length === 0 ? "none" : positiveGaps.join(", ")}`);
  printList("Duplicate numbers", duplicateNumbers);
  if (authUsersError) {
    console.log(`Suspicious numbered profiles: unavailable (${authUsersError})`);
  } else {
    printList("Suspicious numbered profiles", suspiciousNumberedProfiles);
  }
  printList("Automation profiles that still have numbers", automationProfilesWithNumbers);
  if (!discordLinksResult.ok) {
    console.log(`discord_member_links mismatches: unavailable (${discordLinksResult.reason})`);
  } else {
    printList("discord_member_links rows with stale snapshots", staleDiscordLinkRows);
  }

  if (warnings.length > 0) {
    printList("Warnings", warnings);
  }

  if (problems.length > 0) {
    printList("Problems", problems);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`audit-member-numbers failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
