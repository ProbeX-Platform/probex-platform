import { describe, expect, it } from "vitest";

import * as sdk from "./index.js";

describe("sdk", () => {
  it("exports no runtime values, only the logger types", () => {
    expect(Object.keys(sdk)).toEqual([]);
  });
});
