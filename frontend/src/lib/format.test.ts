import { describe, expect, it } from "vitest";

import {
  formatClock,
  formatDuration,
  initials,
  ordinal,
  plural,
  relativeTime,
} from "./format";

describe("formatClock", () => {
  it("handles null and undefined", () => {
    expect(formatClock(null)).toBe("--:--");
    expect(formatClock(undefined)).toBe("--:--");
  });

  it("formats mm:ss correctly", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(5)).toBe("00:05");
    expect(formatClock(59)).toBe("00:59");
    expect(formatClock(60)).toBe("01:00");
    expect(formatClock(75)).toBe("01:15");
    expect(formatClock(900)).toBe("15:00");
  });

  it("formats hours when >= 3600 seconds", () => {
    expect(formatClock(3600)).toBe("1:00:00");
    expect(formatClock(5400)).toBe("1:30:00");
    expect(formatClock(3665)).toBe("1:01:05");
  });
});

describe("formatDuration", () => {
  it("formats elapsed time", () => {
    expect(formatDuration(null)).toBe("--");
    expect(formatDuration(75)).toBe("01:15");
  });
});

describe("ordinal", () => {
  it("handles 1st, 2nd, 3rd, and 4th+", () => {
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(2)).toBe("2nd");
    expect(ordinal(3)).toBe("3rd");
    expect(ordinal(4)).toBe("4th");
    expect(ordinal(11)).toBe("11th");
    expect(ordinal(12)).toBe("12th");
    expect(ordinal(13)).toBe("13th");
    expect(ordinal(21)).toBe("21st");
    expect(ordinal(22)).toBe("22nd");
    expect(ordinal(23)).toBe("23rd");
    expect(ordinal(24)).toBe("24th");
  });
});

describe("plural", () => {
  it("returns singular when count is 1", () => {
    expect(plural(1, "room")).toBe("room");
  });

  it("returns plural when count != 1", () => {
    expect(plural(0, "room")).toBe("rooms");
    expect(plural(5, "room")).toBe("rooms");
  });
});

describe("initials", () => {
  it("extracts up to 2 uppercase initials", () => {
    expect(initials("Null Pointer Exception")).toBe("NP");
    expect(initials("Team")).toBe("T");
  });
});

describe("relativeTime", () => {
  it("handles null", () => {
    expect(relativeTime(null)).toBe("never");
  });

  it("handles just now", () => {
    const nowIso = new Date().toISOString();
    expect(relativeTime(nowIso)).toBe("just now");
  });
});
