# @echohello/discord-mcp

Discord MCP server for Claude, Codex, OpenCode and other MCP clients. TypeScript, stdio transport, ~22 focused tools covering the 80% of Discord interactions agents actually need.

```
npm install -g @echohello/discord-mcp
DISCORD_TOKEN=... discord-mcp
```

## Why

The Discord MCP ecosystem has Java servers, Python servers, and 100-tool kitchen sinks. This one is a small, focused TypeScript implementation built on the official [discord.js](https://discord.js.org/) and [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) packages. Tight tool surface, strict TypeScript, and explicit intent behind each tool.

## Features

- 22 tools covering guilds, channels, messages, threads, members, roles, webhooks and DMs
- Resolve channels/users/roles by ID **or** name (case-insensitive)
- Pagination cursors on message history (`before` / `after` / `around`)
- Forum channel support for posts and threads
- Webhook send works without bot context (just a webhook URL)
- Strict TypeScript, zero `any`, runtime input validation with `zod`
- Single binary, single env var (`DISCORD_TOKEN`)
- Optional container image at `ghcr.io/echohello-dev/discord-mcp` (multi-arch)

## Tools

| Tool | Purpose |
|---|---|
| `list_guilds` | List guilds the bot is a member of |
| `get_guild_info` | Detailed guild info |
| `list_channels` | List channels in a guild, optionally filtered by type |
| `find_channel` | Resolve a channel by ID or name |
| `get_channel_info` | Detailed channel info |
| `list_categories` | List channel categories |
| `create_text_channel` | Create a text channel (requires Manage Channels) |
| `delete_channel` | Delete a channel |
| `send_message` | Send a message (supports reply + tts) |
| `edit_message` | Edit a bot-authored message |
| `delete_message` | Delete a message |
| `read_messages` | Read message history with pagination |
| `add_reaction` | React to a message |
| `remove_reaction` | Remove the bot's reaction |
| `create_thread` | Create a thread (from message or as a forum post) |
| `list_threads` | List active threads (channel-scoped or guild-wide) |
| `reply_in_thread` | Reply in a thread |
| `list_members` | List guild members (with optional search) |
| `get_member` | Get a member by ID/name |
| `find_user` | Find a user globally |
| `list_roles` | List roles |
| `get_role_info` | Get a role by ID/name |
| `list_webhooks` | List webhooks on a channel |
| `create_webhook` | Create a webhook |
| `send_webhook_message` | Send a message via webhook URL |
| `send_private_message` | DM a user |
| `read_private_messages` | Read DM history |

## Install

```bash
npm install -g @echohello/discord-mcp
```

Or run without installing:

```bash
npx @echohello/discord-mcp
```

### Docker

Multi-arch image (`linux/amd64`, `linux/arm64`) at `ghcr.io/echohello-dev/discord-mcp`. The container speaks stdio, so wire it into any MCP client the same way you would the binary.

```bash
docker pull ghcr.io/echohello-dev/discord-mcp
docker run --rm -i -e DISCORD_TOKEN=your-bot-token ghcr.io/echohello-dev/discord-mcp
```

MCP client configs:

```json
{
  "mcpServers": {
    "discord": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "-e", "DISCORD_TOKEN=your-bot-token", "ghcr.io/echohello-dev/discord-mcp"]
    }
  }
}
```

Images are tagged on every `v*.*.*` git tag (see [`.github/workflows/docker.yml`](.github/workflows/docker.yml)).

## Configure your Discord bot

1. Open https://discord.com/developers/applications and create an application.
2. Bot tab → Add Bot → Reset Token → copy it.
3. Bot settings → enable **Server Members Intent** and **Message Content Intent**.
4. OAuth2 → URL Generator → scopes: `bot` → permissions: at minimum
   - View Channels
   - Send Messages
   - Read Message History
   - Add Reactions
   - Manage Messages (for editing/deleting others)
   - Manage Channels (for create/delete channel)
   - Manage Webhooks (for webhook creation)
5. Open the generated URL to invite the bot.

## Configure your MCP client

### Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "discord": {
      "command": "discord-mcp",
      "env": {
        "DISCORD_TOKEN": "your-bot-token",
        "DISCORD_GUILD_ID": "optional-default-guild-id"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add discord -- discord-mcp \
  -e DISCORD_TOKEN=your-bot-token \
  -e DISCORD_GUILD_ID=optional-default-guild-id
```

### OpenCode

```json
{
  "mcp": {
    "discord": {
      "type": "stdio",
      "command": "discord-mcp",
      "env": {
        "DISCORD_TOKEN": "your-bot-token",
        "DISCORD_GUILD_ID": "optional-default-guild-id"
      }
    }
  }
}
```

### Codex

```bash
codex mcp add discord -- discord-mcp -e DISCORD_TOKEN=your-bot-token
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | yes | Bot token from the Discord Developer Portal |
| `DISCORD_GUILD_ID` | no | Default guild; makes `guildId` optional in tool calls |
| `DISCORD_MCP_DEBUG` | no | Set to `1` to enable debug logging on stderr |

## Build from source

```bash
git clone https://github.com/echohello-dev/discord-mcp
cd discord-mcp
npm install
npm run build
node dist/index.js
```

## Development

```bash
npm install
npm run dev       # run with tsx (no build)
npm run typecheck # tsc --noEmit
npm test          # vitest
npm run build     # tsc → dist/
```

## Design notes

- **Single transport (stdio).** The MCP world is moving toward streamable HTTP, but stdio still has the lowest friction for local agent integration.
- **Discord.js v14.** Maintained, typed, and the path of least resistance for a Node-native MCP.
- **Resolvers accept ID or name.** Most users say "send to general"; resolvers translate that into the right channel ID. UUIDs always win when present.
- **Pagination cursors are exposed as `before` / `after` / `around`.** Matches the underlying Discord.js API so advanced callers can compose anything the client can.
- **Forum channels are first-class.** Forum posts are just threads with a parent channel of type `GUILD_FORUM`, so `create_thread` handles both shapes.
- **Webhooks work standalone.** `send_webhook_message` only needs a webhook URL, not the bot context. Useful for CI/CD alerts.
- **22 tools, deliberately.** More tools means more cognitive load on the agent. The cut line: anything where the bot can't act without elevated perms (kick/ban/timeout) and anything that's easy to misfire (mass DMs, role cascades) is intentionally excluded.
- **Original implementation.** Built from scratch on top of the public MCP protocol and public Discord.js API. No code from other Discord MCP implementations.

## License

MIT
