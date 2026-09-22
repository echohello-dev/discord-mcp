import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ToolContext } from "../server.js";
import { resolveTopLevel } from "../resolvers.js";
import { wrap, invalid } from "../errors.js";
import { jsonResult } from "./guilds.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ChannelType } from "discord.js";
import type { TextChannel, NewsChannel } from "discord.js";

type WebhookHostChannel = TextChannel | NewsChannel;

function isWebhookHost(ch: { type: ChannelType }): ch is WebhookHostChannel {
  return ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement;
}

export function registerWebhookTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "list_webhooks",
    "List webhooks attached to a top-level channel.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      channelId: z.string().describe("Channel ID or name (must be a text or announcement channel)."),
    },
    async ({ guildId, channelId }): Promise<CallToolResult> => {
      return wrap(async () => {
        const ch = resolveTopLevel(ctx, { guildId, channelId });
        if (!isWebhookHost(ch)) throw invalid(`Channel ${channelId} cannot host webhooks.`);
        const hooks = await ch.fetchWebhooks();
        const webhooks = hooks.map((w) => ({
          id: w.id,
          name: w.name,
          channelId: w.channelId,
          guildId: w.guildId,
          url: w.url,
          avatar: w.avatar,
        }));
        return jsonResult({ webhooks, count: webhooks.length });
      });
    },
  );

  server.tool(
    "create_webhook",
    "Create a webhook on a channel.",
    {
      guildId: z.string().optional().describe("Guild ID or name. Defaults to DISCORD_GUILD_ID."),
      channelId: z.string().describe("Channel ID or name (must be a text or announcement channel)."),
      name: z.string().min(1).max(80).describe("Webhook name."),
      reason: z.string().max(512).optional().describe("Reason for the audit log."),
    },
    async ({ guildId, channelId, name, reason }): Promise<CallToolResult> => {
      return wrap(async () => {
        const ch = resolveTopLevel(ctx, { guildId, channelId });
        if (!isWebhookHost(ch)) throw invalid(`Channel ${channelId} cannot host webhooks.`);
        const hook = await ch.createWebhook({ name, reason });
        return jsonResult({
          created: true,
          webhook: { id: hook.id, name: hook.name, url: hook.url, channelId: hook.channelId },
        });
      });
    },
  );

  server.tool(
    "send_webhook_message",
    "Send a message through a webhook (no bot token context required).",
    {
      webhookUrl: z.string().url().describe("The full webhook URL (https://discord.com/api/webhooks/...)."),
      content: z.string().min(1).max(2000).describe("Message text."),
      username: z.string().max(80).optional().describe("Override the webhook's display username."),
      avatarUrl: z.string().url().optional().describe("Override the webhook's avatar image."),
    },
    async ({ webhookUrl, content, username, avatarUrl }): Promise<CallToolResult> => {
      return wrap(async () => {
        const { WebhookClient } = await import("discord.js");
        const hook = new WebhookClient({ url: webhookUrl });
        try {
          const payload: { content: string; username?: string; avatarURL?: string } = { content };
          if (username !== undefined) payload.username = username;
          if (avatarUrl !== undefined) payload.avatarURL = avatarUrl;
          const sent = await hook.send(payload);
          const result: Record<string, unknown> = { sent: true };
          if (sent && typeof sent === "object") {
            const s = sent as { id?: string; channel_id?: string };
            if (s.id) result.id = s.id;
            if (s.channel_id) result.channelId = s.channel_id;
          }
          return jsonResult(result);
        } finally {
          const destroyResult: unknown = hook.destroy();
          if (destroyResult && typeof (destroyResult as { catch?: unknown }).catch === "function") {
            (destroyResult as Promise<unknown>).catch(() => undefined);
          }
        }
      });
    },
  );
}
