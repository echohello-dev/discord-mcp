import { describe, it, expect } from "vitest";
import { jsonResult } from "../src/tools/guilds.js";
import { formatMessage, formatMember, formatRole, formatGuild, formatChannel, formatUser } from "../src/format.js";

describe("format helpers", () => {
  it("jsonResult wraps data in text content", () => {
    const out = jsonResult({ hello: "world" });
    expect(out.content).toHaveLength(1);
    expect(out.content[0]?.type).toBe("text");
    const parsed = JSON.parse(out.content[0]?.text ?? "{}");
    expect(parsed.hello).toBe("world");
  });

  it("formatUser produces stable shape", () => {
    const fake = {
      id: "1",
      username: "alice",
      globalName: "Alice",
      bot: false,
      createdAt: new Date("2024-01-01"),
    } as unknown as Parameters<typeof formatUser>[0];
    const out = formatUser(fake);
    expect(out).toMatchObject({
      id: "1",
      username: "alice",
      globalName: "Alice",
      bot: false,
      createdAt: "2024-01-01T00:00:00.000Z",
    });
  });
});
