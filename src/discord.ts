import { Client, GatewayIntentBits, Events, Partials } from "discord.js";
import { logger } from "./logger.js";

export type DiscordClient = Client<true>;

export interface DiscordClientHandle {
  client: DiscordClient;
  login: () => Promise<void>;
}

export function createDiscordClient(token: string): DiscordClientHandle {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildWebhooks,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  client.once(Events.ClientReady, (c) => {
    logger.info(`Logged in as ${c.user.tag} (${c.user.id})`);
    logger.info(`Watching ${c.guilds.cache.size} guild(s)`);
  });

  client.on(Events.Error, (err) => logger.error("Discord client error:", err));
  client.on(Events.Warn, (msg) => logger.warn("Discord client warning:", msg));

  return {
    client: client as DiscordClient,
    login: async () => {
      await client.login(token);
      if (!client.isReady()) {
        await new Promise<void>((resolve) => client.once(Events.ClientReady, () => resolve()));
      }
    },
  };
}
