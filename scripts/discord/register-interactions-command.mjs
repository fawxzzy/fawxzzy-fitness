import { buildDiscordGuildCommandsDefinition } from "../../src/lib/discord/interactions.ts";

const REQUIRED_ENV_VARS = [
  "DISCORD_APPLICATION_ID",
  "DISCORD_BOT_TOKEN",
  "DISCORD_GUILD_ID",
];

function mustGetEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function main() {
  for (const envName of REQUIRED_ENV_VARS) {
    mustGetEnv(envName);
  }

  const applicationId = mustGetEnv("DISCORD_APPLICATION_ID");
  const botToken = mustGetEnv("DISCORD_BOT_TOKEN");
  const guildId = mustGetEnv("DISCORD_GUILD_ID");

  const response = await fetch(
    `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
        "User-Agent": "fawxzzy-fitness-discord-interactions/1.0",
      },
      body: JSON.stringify(buildDiscordGuildCommandsDefinition()),
    },
  );

  const responseText = await response.text();
  const payload = responseText ? JSON.parse(responseText) : null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : response.statusText;

    throw new Error(`Discord command registration failed (${response.status}): ${message}`);
  }

  const count = Array.isArray(payload) ? payload.length : 0;
  console.log(`Registered ${count} Discord guild command${count === 1 ? "" : "s"} for verification, feedback, and curated update workflows.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
