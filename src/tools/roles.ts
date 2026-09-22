import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ToolContext } from "../server.js";
import { resolveGuild, resolveRole } from "../resolvers.js";
import { formatRole } from "../format.js";
import { wrap } from "../errors.js";
import { jsonResult } from "./guilds.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function registerRoleTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "list_roles",
    "List all roles in a guild, sorted by position.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
    },
    async ({ guildId }): Promise<CallToolResult> => {
      return wrap(async () => {
        const guild = resolveGuild(ctx, guildId);
        const roles = Array.from(guild.roles.cache.values())
          .sort((a, b) => b.position - a.position)
          .map(formatRole);
        return jsonResult({ roles, count: roles.length });
      });
    },
  );

  server.tool(
    "get_role_info",
    "Get information about a specific role.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      roleId: z.string().describe("Role ID or name."),
    },
    async ({ guildId, roleId }): Promise<CallToolResult> => {
      return wrap(async () => {
        const guild = resolveGuild(ctx, guildId);
        const role = resolveRole(guild, roleId);
        return jsonResult(formatRole(role));
      });
    },
  );
}
