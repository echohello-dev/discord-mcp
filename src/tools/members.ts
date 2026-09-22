import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ToolContext } from "../server.js";
import { resolveGuild, resolveMember } from "../resolvers.js";
import { formatMember, formatUser } from "../format.js";
import { wrap } from "../errors.js";
import { jsonResult } from "./guilds.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function registerMemberTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "list_members",
    "List members of a guild. Supports paging.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      limit: z.number().int().min(1).max(1000).optional().describe("Members to return (default 100, max 1000)."),
      query: z.string().optional().describe("Filter by username / display name (fuzzy match)."),
    },
    async ({ guildId, limit, query }): Promise<CallToolResult> => {
      return wrap(async () => {
        const guild = resolveGuild(ctx, guildId);
        const max = limit ?? 100;
        const fetched = query
          ? await guild.members.fetch({ query, limit: max })
          : await guild.members.fetch({ limit: max });
        const members = Array.from(fetched.values()).map(formatMember);
        return jsonResult({ guild: { id: guild.id, name: guild.name }, members, count: members.length });
      });
    },
  );

  server.tool(
    "get_member",
    "Get a single guild member by user ID or name.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      userId: z.string().describe("User ID, username, display name, or global name."),
    },
    async ({ guildId, userId }): Promise<CallToolResult> => {
      return wrap(async () => {
        const guild = resolveGuild(ctx, guildId);
        const member = await resolveMember(ctx, guild, userId);
        return jsonResult(formatMember(member));
      });
    },
  );

  server.tool(
    "find_user",
    "Find a Discord user globally by ID or username.",
    {
      userId: z.string().describe("User ID or username."),
    },
    async ({ userId }): Promise<CallToolResult> => {
      return wrap(async () => {
        if (/^\d{17,20}$/.test(userId)) {
          const user = await ctx.client.users.fetch(userId);
          return jsonResult(formatUser(user));
        }
        const guilds = ctx.client.guilds.cache;
        for (const guild of guilds.values()) {
          try {
            const members = await guild.members.fetch({ query: userId, limit: 5 });
            const match = members.find(
              (m) =>
                m.user.username.toLowerCase() === userId.toLowerCase() ||
                m.user.globalName?.toLowerCase() === userId.toLowerCase(),
            );
            if (match) return jsonResult(formatUser(match.user));
          } catch {
            continue;
          }
        }
        return jsonResult({ found: false, message: "User not in any shared guild." });
      });
    },
  );
}
