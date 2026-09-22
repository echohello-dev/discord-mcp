import type { DiscordClient } from "./discord.js";
import type {
  Guild,
  TextChannel,
  NewsChannel,
  ThreadChannel,
  CategoryChannel,
  VoiceChannel,
  StageChannel,
  ForumChannel,
  GuildMember,
  User,
  Role,
  Message,
  GuildBasedChannel,
} from "discord.js";
import { ChannelType } from "discord.js";
import { notFound, invalid } from "./errors.js";

export function resolveGuild(
  ctx: { client: DiscordClient; defaultGuildId?: string | undefined },
  input: string | undefined,
): Guild {
  if (!input) {
    if (!ctx.defaultGuildId) {
      throw invalid("guildId is required (or set DISCORD_GUILD_ID).");
    }
    const guild = ctx.client.guilds.cache.get(ctx.defaultGuildId);
    if (!guild) throw notFound(`Guild ${ctx.defaultGuildId}`);
    return guild;
  }
  const guild = ctx.client.guilds.cache.get(input) ?? findGuildByName(ctx.client, input);
  if (!guild) throw notFound(`Guild ${input}`);
  return guild;
}

function findGuildByName(client: DiscordClient, name: string): Guild | undefined {
  const lower = name.toLowerCase();
  return client.guilds.cache.find((g) => g.name.toLowerCase() === lower);
}

export type TopLevelGuildChannel =
  | TextChannel
  | NewsChannel
  | CategoryChannel
  | VoiceChannel
  | StageChannel
  | ForumChannel;

export type TextLikeChannel = TextChannel | NewsChannel | ThreadChannel;

const TOP_LEVEL_TYPES = new Set<ChannelType>([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildCategory,
  ChannelType.GuildVoice,
  ChannelType.GuildStageVoice,
  ChannelType.GuildForum,
  ChannelType.GuildMedia,
]);

const THREAD_TYPES = new Set<ChannelType>([
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
]);

export function resolveChannel(
  ctx: { client: DiscordClient; defaultGuildId?: string | undefined },
  input: { guildId?: string | undefined; channelId: string },
): TopLevelGuildChannel | ThreadChannel {
  const guild = resolveGuild(ctx, input.guildId);
  const cached = guild.channels.cache.get(input.channelId);
  if (cached && (TOP_LEVEL_TYPES.has(cached.type) || THREAD_TYPES.has(cached.type))) {
    return cached as TopLevelGuildChannel | ThreadChannel;
  }

  const found = guild.channels.cache.find(
    (c) =>
      (TOP_LEVEL_TYPES.has(c.type) || THREAD_TYPES.has(c.type)) &&
      (c.name === input.channelId || c.name.toLowerCase() === input.channelId.toLowerCase()),
  );
  if (found) return found as TopLevelGuildChannel | ThreadChannel;

  throw notFound(`Channel ${input.channelId} in guild ${guild.name}`);
}

export function resolveTextLikeChannel(
  ctx: { client: DiscordClient; defaultGuildId?: string | undefined },
  input: { guildId?: string | undefined; channelId: string },
): TextLikeChannel {
  const ch = resolveChannel(ctx, input);
  if (THREAD_TYPES.has(ch.type)) return ch as ThreadChannel;
  if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) {
    return ch as TextChannel | NewsChannel;
  }
  throw invalid(`Channel ${input.channelId} is not a text-based channel.`);
}

export function resolveTopLevel(
  ctx: { client: DiscordClient; defaultGuildId?: string | undefined },
  input: { guildId?: string | undefined; channelId: string },
): TopLevelGuildChannel {
  const ch = resolveChannel(ctx, input);
  if (THREAD_TYPES.has(ch.type)) {
    throw invalid(`Channel ${input.channelId} is a thread; expected a top-level channel.`);
  }
  return ch as TopLevelGuildChannel;
}

export async function resolveMember(
  ctx: { client: DiscordClient },
  guild: Guild,
  input: string,
): Promise<GuildMember> {
  const cached = guild.members.cache.get(input);
  if (cached) return cached;

  const byUser = await tryFetch(() => guild.members.fetch({ user: input }));
  if (byUser) return byUser;

  const byName = await tryFetch(() => guild.members.fetch({ query: input, limit: 5 }));
  if (byName && byName.size > 0) {
    const exact = byName.find(
      (m) =>
        m.user.username.toLowerCase() === input.toLowerCase() ||
        m.user.globalName?.toLowerCase() === input.toLowerCase() ||
        m.displayName.toLowerCase() === input.toLowerCase(),
    );
    if (exact) return exact;
    const first = byName.first();
    if (first) return first;
  }

  throw notFound(`Member ${input} in guild ${guild.name}`);
}

export async function resolveUser(client: DiscordClient, input: string): Promise<User> {
  const cached = client.users.cache.get(input);
  if (cached) return cached;
  const fetched = await tryFetch(() => client.users.fetch(input));
  if (fetched) return fetched;
  throw notFound(`User ${input}`);
}

export function resolveRole(guild: Guild, input: string): Role {
  const cached = guild.roles.cache.get(input);
  if (cached) return cached;
  const found = guild.roles.cache.find(
    (r) => r.name === input || r.name.toLowerCase() === input.toLowerCase(),
  );
  if (found) return found;
  throw notFound(`Role ${input} in guild ${guild.name}`);
}

export async function resolveMessage(
  channel: TextLikeChannel,
  messageId: string,
): Promise<Message> {
  const cached = channel.messages.cache.get(messageId);
  if (cached) return cached;
  const fetched = await tryFetch(() => channel.messages.fetch(messageId));
  if (fetched) return fetched;
  throw notFound(`Message ${messageId} in channel ${channel.id}`);
}

export function channelTypeLabel(t: ChannelType): string {
  switch (t) {
    case ChannelType.GuildText:
      return "text";
    case ChannelType.GuildVoice:
      return "voice";
    case ChannelType.GuildCategory:
      return "category";
    case ChannelType.GuildAnnouncement:
      return "announcement";
    case ChannelType.AnnouncementThread:
      return "announcement-thread";
    case ChannelType.PublicThread:
      return "public-thread";
    case ChannelType.PrivateThread:
      return "private-thread";
    case ChannelType.GuildStageVoice:
      return "stage";
    case ChannelType.GuildForum:
      return "forum";
    case ChannelType.GuildMedia:
      return "media";
    case ChannelType.DM:
      return "dm";
    case ChannelType.GroupDM:
      return "group-dm";
    default:
      return `type-${t}`;
  }
}

async function tryFetch<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "code" in err) {
      const code = (err as { code: number }).code;
      if (code === 10003 || code === 10007 || code === 10013 || code === 10004) return undefined;
    }
    throw err;
  }
}

export function guildChannelToRaw(ch: unknown): Record<string, unknown> {
  const c = ch as {
    id?: unknown;
    type?: unknown;
    name?: unknown;
    parentId?: unknown;
    position?: unknown;
    topic?: unknown;
    nsfw?: unknown;
    lastMessageId?: unknown;
  };
  const out: Record<string, unknown> = {};
  if (typeof c.id === "string") out.id = c.id;
  if (typeof c.type === "number") {
    out.type = c.type;
    out.typeLabel = channelTypeLabel(c.type as ChannelType);
  }
  if (typeof c.name === "string") out.name = c.name;
  if (c.parentId === null || typeof c.parentId === "string") out.parentId = c.parentId ?? null;
  if (typeof c.position === "number") out.position = c.position;
  if ("topic" in c) out.topic = (c.topic as string | null) ?? null;
  if ("nsfw" in c) out.nsfw = c.nsfw as boolean;
  if ("lastMessageId" in c) out.lastMessageId = (c.lastMessageId as string | null) ?? null;
  return out;
}
