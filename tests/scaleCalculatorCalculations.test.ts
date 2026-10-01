import { describe, expect, test } from "vitest";

import {
  generateUniqueStepName,
  insertStepInList,
  moveStepInList,
  moveStepToIndex,
  removeStepFromList,
  removeStepRecord,
  renameStepInList,
  renameStepRecord,
} from "../src/admin/components/pages/Wizzard/components/ScaleCalculator/calculations";

describe("scale calculator step helpers", () => {
  test("generates a unique name from a preferred base", () => {
    expect(generateUniqueStepName(["xs", "sm", "base"], "base")).toBe("base-2");
    expect(generateUniqueStepName(["xs", "sm", "base"], "lg")).toBe("lg");
  });

  test("renames a step in the ordered list", () => {
    expect(renameStepInList(["xs", "sm", "base"], "sm", "body")).toEqual([
      "xs",
      "body",
      "base",
    ]);
  });

  test("inserts a step at the requested index", () => {
    expect(insertStepInList(["xs", "base"], 1, "sm")).toEqual([
      "xs",
      "sm",
      "base",
    ]);
  });

  test("removes a step from the ordered list", () => {
    expect(removeStepFromList(["xs", "sm", "base"], "sm")).toEqual([
      "xs",
      "base",
    ]);
  });

  test("moves a step to a new position in the ordered list", () => {
    expect(moveStepInList(["xs", "sm", "base", "lg"], "lg", "sm")).toEqual([
      "xs",
      "lg",
      "sm",
      "base",
    ]);
  });

  test("moves a step to a specific insertion index", () => {
    expect(moveStepToIndex(["xs", "sm", "base", "lg"], "sm", 3)).toEqual([
      "xs",
      "base",
      "sm",
      "lg",
    ]);

    expect(moveStepToIndex(["xs", "sm", "base", "lg"], "xs", 4)).toEqual([
      "sm",
      "base",
      "lg",
      "xs",
    ]);
  });

  test("renames keyed step records", () => {
    expect(
      renameStepRecord(
        {
          sm: { enabled: true, value: "", fluidClamp: "", minBase: "", maxBase: "" },
          base: { enabled: true, value: "", fluidClamp: "", minBase: "", maxBase: "" },
        },
        "sm",
        "body"
      )
    ).toEqual({
      body: { enabled: true, value: "", fluidClamp: "", minBase: "", maxBase: "" },
      base: { enabled: true, value: "", fluidClamp: "", minBase: "", maxBase: "" },
    });
  });

  test("removes keyed step records", () => {
    expect(
      removeStepRecord(
        {
          sm: { enabled: true },
          base: { enabled: false },
        },
        "sm"
      )
    ).toEqual({
      base: { enabled: false },
    });
  });
});
