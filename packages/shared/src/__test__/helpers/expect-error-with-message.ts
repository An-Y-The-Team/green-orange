import { expect } from "vitest";

/**
 * Helper function to assert error with message
 * Accepts any error constructor class that extends Error
 */
export const expectErrorWithMessage = <T extends Error>(
  fn: () => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test utility needs to accept any error constructor signature
  errorClass: new (...args: any[]) => T,
  message: string
) => {
  try {
    fn();
    expect.fail("Expected function to throw an error");
  } catch (error) {
    expect(error).toBeInstanceOf(errorClass);
    expect((error as T).message).toBe(message);
  }
};
