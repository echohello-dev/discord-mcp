type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, parts: unknown[]): void {
  const stream = level === "error" || level === "warn" ? process.stderr : process.stderr;
  const prefix = `[discord-mcp] ${level.toUpperCase()}`;
  const msg = parts
    .map((p) => (typeof p === "string" ? p : p instanceof Error ? p.stack ?? p.message : JSON.stringify(p)))
    .join(" ");
  stream.write(`${prefix} ${msg}\n`);
}

export const logger = {
  debug: (...parts: unknown[]): void => {
    if (process.env.DISCORD_MCP_DEBUG === "1") emit("debug", parts);
  },
  info: (...parts: unknown[]): void => emit("info", parts),
  warn: (...parts: unknown[]): void => emit("warn", parts),
  error: (...parts: unknown[]): void => emit("error", parts),
};
