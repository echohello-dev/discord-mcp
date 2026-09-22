import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ToolContext } from "../server.js";
import { resolveGuild } from "../resolvers.js";
import { formatGuild } from "../format.js";
import { wrap } from "../errors.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function registerGuildTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "list_guilds",
    "List Discord guilds (servers) the bot is a member of.",
    {},
    async (): Promise<CallToolResult> => {
      return wrap(async () => {
        const guilds = Array.from(ctx.client.guilds.cache.values()).map(formatGuild);
        return jsonResult({ guilds, count: guilds.length });
      });
    },
  );

  server.tool(
    "get_guild_info",
    "Get detailed information about a specific guild.",
    {
      guildId: z
        .string()
        .optional()
        .describe("Guild ID or name. Defaults to DISCORD_GUILD_ID env var when omitted."),
    },
    async ({ guildId }): Promise<CallToolResult> => {
      return wrap(async () => {
        const guild = resolveGuild(ctx, guildId);
        return jsonResult(formatGuild(guild));
      });
    },
  );
}

export function jsonResult(data: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}
