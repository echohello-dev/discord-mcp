import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ToolContext } from "../server.js";
import { resolveGuild, resolveChannel, resolveTextLikeChannel } from "../resolvers.js";
import { formatMessage } from "../format.js";
import { wrap, invalid } from "../errors.js";
import { jsonResult } from "./guilds.js";
import { ChannelType } from "discord.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { AnyThreadChannel, ThreadChannel } from "discord.js";

function serializeThread(t: ThreadChannel<boolean>): Record<string, unknown> {
  return {
    id: t.id,
    name: t.name,
    parentId: t.parentId,
    archived: t.archived,
    locked: t.locked,
    memberCount: t.memberCount,
    messageCount: t.messageCount ?? null,
  };
}

export function registerThreadTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "create_thread",
    "Create a new thread from a message or in a forum channel.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      channelId: z.string().describe("Channel ID or name (the parent channel)."),
      name: z.string().min(1).max(100).describe("Thread name."),
      messageId: z.string().optional().describe("Source message ID (omit to start a forum post)."),
      content: z.string().min(1).max(2000).optional().describe("Initial message content."),
      autoArchiveDuration: z
        .number()
        .int()
        .min(60)
        .max(10080)
        .optional()
        .describe("Auto-archive in minutes (60, 1440, 4320, 10080)."),
    },
    async ({ guildId, channelId, name, messageId, content, autoArchiveDuration }): Promise<CallToolResult> => {
      return wrap(async () => {
        const ch = resolveChannel(ctx, { guildId, channelId });
        const archive = (autoArchiveDuration ?? 1440) as 60 | 1440 | 4320 | 10080;

        if (ch.type === ChannelType.GuildForum) {
          if (!content) throw invalid("content is required when creating a forum post.");
          const post = await ch.threads.create({
            name,
            message: { content },
            autoArchiveDuration: archive,
          });
          return jsonResult({
            created: true,
            thread: {
              id: post.id,
              name: post.name,
              parentId: post.parentId,
              type: post.type,
            },
          });
        }

        if (ch.type !== ChannelType.GuildText && ch.type !== ChannelType.GuildAnnouncement) {
          throw invalid(`Channel ${channelId} cannot host threads.`);
        }

        if (!messageId) throw invalid("messageId is required when creating a thread on a text channel.");
        const textCh = ch as import("discord.js").TextChannel | import("discord.js").NewsChannel;
        const source = await textCh.messages.fetch(messageId);
        if (!source) throw invalid(`Message ${messageId} not found.`);
        const thread = await source.startThread({
          name,
          autoArchiveDuration: archive,
        });
        return jsonResult({
          created: true,
          thread: { id: thread.id, name: thread.name, parentId: thread.parentId, type: thread.type },
        });
      });
    },
  );

  server.tool(
    "list_threads",
    "List active threads in a guild, optionally narrowed to one channel's children.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      channelId: z
        .string()
        .optional()
        .describe("Optional: list threads whose parent is this channel (must be a text or announcement channel)."),
    },
    async ({ guildId, channelId }): Promise<CallToolResult> => {
      return wrap(async () => {
        const guild = resolveGuild(ctx, guildId);
        if (channelId) {
          const ch = resolveTextLikeChannel(ctx, { guildId, channelId });
          if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) {
            const fetched = await ch.threads.fetchActive();
            const threads = Array.from(fetched.threads.values()).map((t) =>
              serializeThread(t as ThreadChannel<boolean>),
            );
            return jsonResult({ threads, count: threads.length });
          }
          throw invalid(`Channel ${channelId} cannot have child threads listed via this tool.`);
        }
        const fetched = await guild.channels.fetchActiveThreads();
        const threads = Array.from(fetched.threads.values()).map((t: AnyThreadChannel) =>
          serializeThread(t as ThreadChannel<boolean>),
        );
        return jsonResult({ threads, count: threads.length });
      });
    },
  );

  server.tool(
    "reply_in_thread",
    "Send a reply in a thread (alias for send_message that resolves a thread by ID/name).",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      threadId: z.string().describe("Thread ID or name."),
      content: z.string().min(1).max(2000).describe("Reply text."),
    },
    async ({ guildId, threadId, content }): Promise<CallToolResult> => {
      return wrap(async () => {
        const ch = resolveTextLikeChannel(ctx, { guildId, channelId: threadId });
        const sent = await ch.send({ content });
        return jsonResult({ sent: true, message: formatMessage(sent) });
      });
    },
  );
}
