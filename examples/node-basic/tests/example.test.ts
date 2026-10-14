import { expect, test } from "vitest";

export const sum = (a: number, b: number) => a + b;

test("Example test of `sum` function", () => {
  expect(sum(1, 2)).toBe(3);
});
