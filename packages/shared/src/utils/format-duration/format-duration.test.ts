import { describe, expect, it } from "vitest";

import { formatDuration } from "./format-duration";

describe("formatDuration", () => {
  it("should format seconds to MM:SS", () => {
    // Arrange & Act
    const result = formatDuration(125);

    // Assert
    expect(result).toBe("2:05");
  });

  it("should handle zero seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  it("should handle single digit minutes", () => {
    expect(formatDuration(65)).toBe("1:05");
  });

  it("should handle double digit minutes", () => {
    expect(formatDuration(605)).toBe("10:05");
  });

  it("should pad seconds with leading zero", () => {
    expect(formatDuration(61)).toBe("1:01");
  });

  it("should handle exactly 60 seconds", () => {
    expect(formatDuration(60)).toBe("1:00");
  });

  it("should handle large durations", () => {
    expect(formatDuration(3661)).toBe("61:01");
  });
});
