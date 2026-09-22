import type {
  Guild,
  GuildMember,
  Role,
  Message,
  User,
} from "discord.js";

export function formatGuild(g: Guild): Record<string, unknown> {
  return {
    id: g.id,
    name: g.name,
    memberCount: g.memberCount,
    approximateMemberCount: g.approximateMemberCount ?? null,
    ownerId: g.ownerId,
    joinedAt: g.joinedAt?.toISOString() ?? null,
    description: g.description,
    premiumTier: g.premiumTier,
    channelCount: g.channels.cache.size,
    roleCount: g.roles.cache.size,
  };
}

export function formatMember(m: GuildMember): Record<string, unknown> {
  return {
    userId: m.user.id,
    username: m.user.username,
    globalName: m.user.globalName ?? null,
    displayName: m.displayName,
    nickname: m.nickname,
    joinedAt: m.joinedAt?.toISOString() ?? null,
    roles: m.roles.cache.map((r) => ({ id: r.id, name: r.name, color: r.hexColor })),
    bot: m.user.bot,
  };
}

export function formatRole(r: Role): Record<string, unknown> {
  return {
    id: r.id,
    name: r.name,
    color: r.hexColor,
    position: r.position,
    hoist: r.hoist,
    mentionable: r.mentionable,
    managed: r.managed,
    memberCount: r.members.size,
  };
}

export function formatMessage(m: Message): Record<string, unknown> {
  return {
    id: m.id,
    channelId: m.channelId,
    guildId: m.guildId,
    author: {
      id: m.author.id,
      username: m.author.username,
      globalName: m.author.globalName ?? null,
      bot: m.author.bot,
    },
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
    pinned: m.pinned,
    tts: m.tts,
    attachments: m.attachments.map((a) => ({
      id: a.id,
      filename: a.name,
      url: a.url,
      size: a.size,
      contentType: a.contentType,
    })),
    embeds: m.embeds.length,
    reactions: m.reactions.cache.map((r) => ({
      emoji: r.emoji.name ?? r.emoji.toString(),
      count: r.count,
    })),
    mentionedUsers: Array.from(m.mentions.users.keys()),
    mentionedRoles: Array.from(m.mentions.roles.keys()),
  };
}

export function formatUser(u: User): Record<string, unknown> {
  return {
    id: u.id,
    username: u.username,
    globalName: u.globalName ?? null,
    bot: u.bot,
    createdAt: u.createdAt.toISOString(),
  };
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "\u2026";
}
