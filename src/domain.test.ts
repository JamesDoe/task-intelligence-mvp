import { describe, it, expect } from "vitest";
import { evaluate } from "./domain/evaluator";
import { Condition } from "./domain/conditions";

describe("STANDARD_DOCUMENT_SIGNING", () => {
  it("passes when signed within 3 days of receipt", () => {
    const condition: Condition = {
      type: "all",
      conditions: [
        { type: "occurred", eventKey: "doc.executed" },
        {
          type: "within",
          eventKey: "doc.executed",
          anchorKey: "doc.received",
          durationMs: 3 * 24 * 60 * 60 * 1000,
        },
      ],
    };

    const ctx = {
      getEventsByKey: (key: string) => {
        const events = {
          "doc.received": [
            { key, occurredAt: "2026-01-01T00:00:00Z" },
          ],
          "doc.executed": [
            { key, occurredAt: "2026-01-02T12:00:00Z" },
          ],
        };
        return events[key] ?? [];
      },
    };

    const result = evaluate(condition, ctx);
    expect(result.pass).toBe(true);
  });
});
