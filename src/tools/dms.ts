import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ToolContext } from "../server.js";
import { resolveUser } from "../resolvers.js";
import { formatMessage } from "../format.js";
import { wrap } from "../errors.js";
import { jsonResult } from "./guilds.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function registerDmTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "send_private_message",
    "Send a direct message to a user by ID or username.",
    {
      userId: z.string().describe("User ID or username."),
      content: z.string().min(1).max(2000).describe("Message text."),
    },
    async ({ userId, content }): Promise<CallToolResult> => {
      return wrap(async () => {
        const user = await resolveUser(ctx.client, userId);
        const dm = await user.createDM();
        const sent = await dm.send({ content });
        return jsonResult({ sent: true, message: formatMessage(sent) });
      });
    },
  );

  server.tool(
    "read_private_messages",
    "Read recent direct messages with a user.",
    {
      userId: z.string().describe("User ID or username."),
      limit: z.number().int().min(1).max(100).optional().describe("Messages to return (1-100, default 25)."),
    },
    async ({ userId, limit }): Promise<CallToolResult> => {
      return wrap(async () => {
        const user = await resolveUser(ctx.client, userId);
        const dm = await user.createDM();
        const msgs = await dm.messages.fetch({ limit: limit ?? 25 });
        const sorted = Array.from(msgs.values()).sort(
          (a, b) => a.createdTimestamp - b.createdTimestamp,
        );
        return jsonResult({
          channelId: dm.id,
          with: { id: user.id, username: user.username },
          count: sorted.length,
          messages: sorted.map(formatMessage),
        });
      });
    },
  );
}
