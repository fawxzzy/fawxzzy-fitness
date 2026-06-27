const lines = [
  "Discord command polling no longer belongs to fawxzzy-fitness.",
  "Use the hosted DiscordOS worker instead:",
  "- repo: https://github.com/fawxzzy/DiscordOS",
  "- workflow: Discord Message Command Worker",
  "- production runtime: https://fawxzzy-discordos.vercel.app",
];

for (const line of lines) {
  console.error(line);
}

process.exitCode = 1;
