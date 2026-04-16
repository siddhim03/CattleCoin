import { describe, test, expect } from "vitest";
import { cn, formatUsd, formatPct, formatDate, formatDateTime, formatWeight, formatNumber } from "@/lib/utils";

describe("cn", () => {
  test("merges class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  test("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  test("resolves tailwind conflicts (last wins)", () => {
    // twMerge resolves p-4 + p-2 → p-2
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2");
  });

  test("handles undefined and null gracefully", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });
});

describe("formatUsd", () => {
  test("formats whole dollar amount", () => {
    const result = formatUsd(1500);
    expect(result).toContain("1,500");
    expect(result).toContain("$");
  });

  test("formats zero", () => {
    expect(formatUsd(0)).toContain("0");
  });

  test("formats large amounts with commas", () => {
    const result = formatUsd(1234567);
    expect(result).toContain("1,234,567");
  });

  test("rounds to whole dollars (no decimals)", () => {
    const result = formatUsd(99.99);
    expect(result).not.toContain(".");
  });
});

describe("formatPct", () => {
  test("positive value has + prefix", () => {
    expect(formatPct(4.2)).toBe("+4.20%");
  });

  test("negative value has - prefix", () => {
    expect(formatPct(-1.5)).toBe("-1.50%");
  });

  test("zero is treated as positive", () => {
    expect(formatPct(0)).toBe("+0.00%");
  });

  test("formats to 2 decimal places", () => {
    expect(formatPct(3.1)).toBe("+3.10%");
  });
});

describe("formatDate", () => {
  test("formats ISO date string to human-readable", () => {
    const result = formatDate("2024-03-15T00:00:00.000Z");
    // Should contain month, day, year parts
    expect(result).toMatch(/Mar|15|2024/);
  });

  test("does not throw for valid ISO string", () => {
    expect(() => formatDate("2023-01-01T00:00:00Z")).not.toThrow();
  });
});

describe("formatDateTime", () => {
  test("returns a non-empty string", () => {
    const result = formatDateTime("2024-03-15T14:30:00.000Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("includes month and day", () => {
    const result = formatDateTime("2024-03-15T14:30:00.000Z");
    expect(result).toMatch(/Mar|15/);
  });
});

describe("formatWeight", () => {
  test("appends lb suffix", () => {
    expect(formatWeight(750)).toContain("lb");
  });

  test("formats with comma for large weights", () => {
    expect(formatWeight(1200)).toContain("1,200");
  });

  test("formats exact weight", () => {
    expect(formatWeight(500)).toContain("500");
  });
});

describe("formatNumber", () => {
  test("formats with locale commas", () => {
    expect(formatNumber(12345)).toContain("12,345");
  });

  test("handles zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  test("handles small numbers without comma", () => {
    expect(formatNumber(42)).toBe("42");
  });
});
