import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ToolContext } from "../server.js";
import { resolveTextLikeChannel, resolveMessage } from "../resolvers.js";
import { formatMessage } from "../format.js";
import { wrap, invalid } from "../errors.js";
import { jsonResult } from "./guilds.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Message } from "discord.js";

export function registerMessageTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "send_message",
    "Send a message to a text-based channel or thread.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      channelId: z.string().describe("Channel ID or name (text channel or thread)."),
      content: z.string().min(1).max(2000).describe("Message text (max 2000 chars)."),
      replyTo: z.string().optional().describe("Message ID to reply to."),
      tts: z.boolean().optional().describe("Send as text-to-speech. Defaults to false."),
    },
    async ({ guildId, channelId, content, replyTo, tts }): Promise<CallToolResult> => {
      return wrap(async () => {
        const ch = resolveTextLikeChannel(ctx, { guildId, channelId });
        const messageOptions: { content: string; tts?: boolean; reply?: { messageReference: string } } = {
          content,
        };
        if (tts !== undefined) messageOptions.tts = tts;
        if (replyTo) messageOptions.reply = { messageReference: replyTo };
        const sent = await ch.send(messageOptions);
        return jsonResult({ sent: true, message: formatMessage(sent) });
      });
    },
  );

  server.tool(
    "edit_message",
    "Edit a message previously sent by the bot.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      channelId: z.string().describe("Channel ID or name."),
      messageId: z.string().describe("ID of the message to edit."),
      content: z.string().min(1).max(2000).describe("New message text."),
    },
    async ({ guildId, channelId, messageId, content }): Promise<CallToolResult> => {
      return wrap(async () => {
        const ch = resolveTextLikeChannel(ctx, { guildId, channelId });
        const msg = await resolveMessage(ch, messageId);
        if (msg.author.id !== ctx.client.user?.id) {
          throw invalid("Bot can only edit messages it authored.");
        }
        const edited: Message = await msg.edit({ content });
        return jsonResult({ edited: true, message: formatMessage(edited) });
      });
    },
  );

  server.tool(
    "delete_message",
    "Delete a message. Bot can always delete its own messages; deleting others' messages requires Manage Messages.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      channelId: z.string().describe("Channel ID or name."),
      messageId: z.string().describe("ID of the message to delete."),
    },
    async ({ guildId, channelId, messageId }): Promise<CallToolResult> => {
      return wrap(async () => {
        const ch = resolveTextLikeChannel(ctx, { guildId, channelId });
        const msg = await resolveMessage(ch, messageId);
        await msg.delete();
        return jsonResult({ deleted: true, id: messageId });
      });
    },
  );

  server.tool(
    "read_messages",
    "Read recent message history from a channel or thread.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      channelId: z.string().describe("Channel ID or name."),
      limit: z.number().int().min(1).max(100).optional().describe("Messages to return (1-100, default 25)."),
      before: z.string().optional().describe("Pagination cursor: fetch messages before this message ID."),
      after: z.string().optional().describe("Pagination cursor: fetch messages after this message ID."),
      around: z.string().optional().describe("Pagination cursor: fetch messages around this message ID."),
    },
    async ({ guildId, channelId, limit, before, after, around }): Promise<CallToolResult> => {
      return wrap(async () => {
        const ch = resolveTextLikeChannel(ctx, { guildId, channelId });
        const opts: { limit: number; before?: string; after?: string; around?: string } = {
          limit: limit ?? 25,
        };
        if (before !== undefined) opts.before = before;
        if (after !== undefined) opts.after = after;
        if (around !== undefined) opts.around = around;
        const msgs = await ch.messages.fetch(opts);
        const sorted = Array.from(msgs.values()).sort(
          (a, b) => a.createdTimestamp - b.createdTimestamp,
        );
        return jsonResult({
          channelId: ch.id,
          count: sorted.length,
          messages: sorted.map(formatMessage),
        });
      });
    },
  );

  server.tool(
    "add_reaction",
    "Add an emoji reaction to a message.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      channelId: z.string().describe("Channel ID or name."),
      messageId: z.string().describe("ID of the message to react to."),
      emoji: z.string().min(1).describe("Emoji to react with (unicode or custom name:id)."),
    },
    async ({ guildId, channelId, messageId, emoji }): Promise<CallToolResult> => {
      return wrap(async () => {
        const ch = resolveTextLikeChannel(ctx, { guildId, channelId });
        const msg = await resolveMessage(ch, messageId);
        await msg.react(emoji);
        return jsonResult({ reacted: true, messageId, emoji });
      });
    },
  );

  server.tool(
    "remove_reaction",
    "Remove the bot's emoji reaction from a message.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      channelId: z.string().describe("Channel ID or name."),
      messageId: z.string().describe("ID of the message."),
      emoji: z.string().min(1).describe("Emoji to remove (must match exactly)."),
    },
    async ({ guildId, channelId, messageId, emoji }): Promise<CallToolResult> => {
      return wrap(async () => {
        const ch = resolveTextLikeChannel(ctx, { guildId, channelId });
        const msg = await resolveMessage(ch, messageId);
        const reaction = msg.reactions.cache.find(
          (r) => r.emoji.name === emoji || r.emoji.toString() === emoji || r.emoji.id === emoji,
        );
        if (!reaction) throw invalid(`Bot has no reaction ${emoji} on this message.`);
        if (!ctx.client.user) throw invalid("Bot user not available.");
        await reaction.users.remove(ctx.client.user.id);
        return jsonResult({ removed: true, messageId, emoji });
      });
    },
  );
}
