import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ToolContext } from "../server.js";
import { resolveGuild, resolveChannel, resolveTopLevel, guildChannelToRaw, channelTypeLabel } from "../resolvers.js";
import { wrap, invalid } from "../errors.js";
import { jsonResult } from "./guilds.js";
import { ChannelType } from "discord.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function registerChannelTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "list_channels",
    "List all top-level channels in a guild (text, voice, categories, forums, media).",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      types: z
        .array(z.nativeEnum(ChannelType))
        .optional()
        .describe("Filter to specific channel types (numeric). Optional."),
    },
    async ({ guildId, types }): Promise<CallToolResult> => {
      return wrap(async () => {
        const guild = resolveGuild(ctx, guildId);
        let channels = Array.from(guild.channels.cache.values()).filter((c) => c.parentId === null);
        if (types && types.length > 0) {
          channels = channels.filter((c) => types.includes(c.type));
        }
        return jsonResult({
          guild: { id: guild.id, name: guild.name },
          channels: channels.map((c) => ({ ...guildChannelToRaw(c), typeLabel: channelTypeLabel(c.type) })),
          count: channels.length,
        });
      });
    },
  );

  server.tool(
    "find_channel",
    "Find a channel by its name or ID within a guild.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      channelId: z.string().describe("Channel ID or name to look up."),
    },
    async ({ guildId, channelId }): Promise<CallToolResult> => {
      return wrap(async () => {
        const ch = resolveChannel(ctx, { guildId, channelId });
        return jsonResult({
          ...guildChannelToRaw(ch),
          typeLabel: channelTypeLabel(ch.type),
        });
      });
    },
  );

  server.tool(
    "get_channel_info",
    "Get detailed information about a specific channel.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      channelId: z.string().describe("Channel ID or name."),
    },
    async ({ guildId, channelId }): Promise<CallToolResult> => {
      return wrap(async () => {
        const ch = resolveChannel(ctx, { guildId, channelId });
        return jsonResult({
          ...guildChannelToRaw(ch),
          typeLabel: channelTypeLabel(ch.type),
        });
      });
    },
  );

  server.tool(
    "list_categories",
    "List channel categories in a guild with their child channel counts.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
    },
    async ({ guildId }): Promise<CallToolResult> => {
      return wrap(async () => {
        const guild = resolveGuild(ctx, guildId);
        const categories = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory);
        const items = Array.from(categories.values()).map((cat) => {
          const children = guild.channels.cache.filter((c) => c.parentId === cat.id);
          return {
            ...guildChannelToRaw(cat),
            typeLabel: channelTypeLabel(cat.type),
            channelCount: children.size,
          };
        });
        return jsonResult({ categories: items, count: items.length });
      });
    },
  );

  server.tool(
    "create_text_channel",
    "Create a new text channel in a guild. Requires the Manage Channels permission.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      name: z.string().min(1).max(100).describe("Channel name (lowercase, dashes, no spaces)."),
      topic: z.string().max(1024).optional().describe("Channel topic."),
      categoryId: z.string().optional().describe("Parent category ID."),
      nsfw: z.boolean().optional().describe("Mark as NSFW. Defaults to false."),
      reason: z.string().max(512).optional().describe("Reason recorded in the audit log."),
    },
    async ({ guildId, name, topic, categoryId, nsfw, reason }): Promise<CallToolResult> => {
      return wrap(async () => {
        const guild = resolveGuild(ctx, guildId);
        if (!/^[\w-]{1,100}$/.test(name)) {
          throw invalid("Channel name must be 1-100 chars: letters, digits, dashes, underscores.");
        }
        const created = await guild.channels.create({
          name,
          type: ChannelType.GuildText,
          topic,
          parent: categoryId,
          nsfw: nsfw ?? false,
          reason,
        });
        return jsonResult({
          created: true,
          channel: { ...guildChannelToRaw(created), typeLabel: channelTypeLabel(created.type) },
        });
      });
    },
  );

  server.tool(
    "delete_channel",
    "Delete a top-level channel. Requires the Manage Channels permission.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      channelId: z.string().describe("Channel ID or name."),
      reason: z.string().max(512).optional().describe("Reason recorded in the audit log."),
    },
    async ({ guildId, channelId, reason }): Promise<CallToolResult> => {
      return wrap(async () => {
        const ch = resolveTopLevel(ctx, { guildId, channelId });
        const id = ch.id;
        const name = ch.name;
        await ch.delete(reason);
        return jsonResult({ deleted: true, id, name });
      });
    },
  );
}
