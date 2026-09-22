#!/usr/bin/env node
import { startServer } from "./server.js";
import { logger } from "./logger.js";

const token = process.env.DISCORD_TOKEN;
if (!token) {
  logger.error("DISCORD_TOKEN environment variable is required.");
  logger.error("Create a Discord bot and invite it to your server first.");
  logger.error("See: https://discord.com/developers/applications");
  process.exit(1);
}

const defaultGuildId = process.env.DISCORD_GUILD_ID;

startServer({ token, defaultGuildId }).catch((err: unknown) => {
  logger.error("Fatal error:", err);
  process.exit(1);
});
