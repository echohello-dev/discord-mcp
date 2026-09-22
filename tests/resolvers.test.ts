import { describe, it, expect } from "vitest";
import { createDiscordClient } from "../src/discord.js";

describe("discord client", () => {
  it("constructor does not require a working token", () => {
    const handle = createDiscordClient("test-token-not-real");
    expect(handle.client).toBeDefined();
    expect(typeof handle.login).toBe("function");
    expect(typeof handle.client.destroy).toBe("function");
    handle.client.destroy().catch(() => undefined);
  });

  it("login function returns a promise", () => {
    const handle = createDiscordClient("test-token-not-real");
    const p = handle.login();
    expect(p).toBeInstanceOf(Promise);
    p.catch(() => undefined);
  });
});
