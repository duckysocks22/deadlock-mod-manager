import { describe, expect, it } from "bun:test";
import { JOIN_CODE_ALPHABET, generateJoinCode } from "./join-code";

describe("generateJoinCode", () => {
  it("uses the requested length", () => {
    expect(generateJoinCode(8).length).toBe(8);
    expect(generateJoinCode(12).length).toBe(12);
  });

  it("only uses unambiguous characters", () => {
    for (let i = 0; i < 100; i++) {
      for (const char of generateJoinCode()) {
        expect(JOIN_CODE_ALPHABET).toContain(char);
      }
    }
  });

  it("generates distinct codes across calls", () => {
    const codes = new Set(
      Array.from({ length: 100 }, () => generateJoinCode()),
    );
    expect(codes.size).toBeGreaterThan(90);
  });
});
