import { describe, expect, it } from "vitest";
import { stripUnsafeUiFields } from "./observability";

describe("observability ui helper", () => {
  it("does not include raw sensitive fields", () => {
    const detail = stripUnsafeUiFields({
      run_id: "r1",
      transcript: "raw transcript",
      answer_text: "raw answer",
      api_key: "secret",
      action: "copy_answer",
    });

    expect(detail).toContain("run_id=r1");
    expect(detail).toContain("action=copy_answer");
    expect(detail).not.toContain("raw transcript");
    expect(detail).not.toContain("raw answer");
    expect(detail).not.toContain("secret");
  });
});
