import { createDiscordClient, type DiscordClientHandle } from "./discord.js";
import { logger } from "./logger.js";
import { registerGuildTools } from "./tools/guilds.js";
import { registerChannelTools } from "./tools/channels.js";
import { registerMessageTools } from "./tools/messages.js";
import { registerThreadTools } from "./tools/threads.js";
import { registerMemberTools } from "./tools/members.js";
import { registerRoleTools } from "./tools/roles.js";
import { registerWebhookTools } from "./tools/webhooks.js";
import { registerDmTools } from "./tools/dms.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { DiscordClient } from "./discord.js";

export interface StartOptions {
  token: string;
  defaultGuildId?: string | undefined;
}

export async function startServer(opts: StartOptions): Promise<void> {
  const handle = createDiscordClient(opts.token);
  const shutdown = async (): Promise<void> => {
    logger.info("Shutting down...");
    try {
      await handle.client.destroy();
    } catch (err) {
      logger.warn("Error destroying Discord client:", err);
    }
    process.exit(0);
  };
  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });

  await handle.login();

  const server = new McpServer({
    name: "discord-mcp",
    version: "0.1.0",
  });

  const ctx: ToolContext = {
    client: handle.client,
    defaultGuildId: opts.defaultGuildId,
  };

  registerGuildTools(server, ctx);
  registerChannelTools(server, ctx);
  registerMessageTools(server, ctx);
  registerThreadTools(server, ctx);
  registerMemberTools(server, ctx);
  registerRoleTools(server, ctx);
  registerWebhookTools(server, ctx);
  registerDmTools(server, ctx);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("discord-mcp connected on stdio");
}

export interface ToolContext {
  readonly client: DiscordClient;
  readonly defaultGuildId: string | undefined;
}

export type { DiscordClientHandle };
