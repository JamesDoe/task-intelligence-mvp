import { describe, it, expect } from "vitest";
import { evaluate } from "./domain/evaluator";
import type { Condition } from "./domain/conditions";
import type { Bindings, Event } from "./domain/types";

function storeFrom(events: Event[]) {
  return {
    getEventsByKey: (key: string) =>
      events.filter((e) => e.key === key).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)),
  };
}

const bindings: Bindings = {
  docReceived: "agreement.doc_987.received",
  docExecuted: "agreement.doc_987.executed",
  signingWindow: "P3D",
};

describe("Binding-aware evaluator (DB-free)", () => {
  it("STANDARD_DOCUMENT_SIGNING passes (refs resolved via bindings)", () => {
    const store = storeFrom([
      { key: "agreement.doc_987.received", occurredAt: "2026-01-02T00:00:00Z" },
      { key: "agreement.doc_987.executed", occurredAt: "2026-01-04T00:00:00Z" },
    ]);

    const rule: Condition = {
      type: "all",
      conditions: [
        { type: "occurred", eventKey: { ref: "docExecuted" } },
        { type: "within", eventKey: { ref: "docExecuted" }, anchorKey: { ref: "docReceived" }, duration: { ref: "signingWindow" } },
      ],
    };

    const res = evaluate(rule, bindings, store);
    expect(res.pass).toBe(true);
  });

  it("fails deterministically if a binding is missing", () => {
    const store = storeFrom([{ key: "agreement.doc_987.received", occurredAt: "2026-01-02T00:00:00Z" }]);

    const rule: Condition = { type: "occurred", eventKey: { ref: "docExecuted" } };

    const res = evaluate(rule, { docReceived: "x" } as any, store);

    expect(res.pass).toBe(false);
    expect(res.reasons.join(" ")).toMatch(/Unbound reference/i);
    expect(res.reasons.join(" ")).toMatch(/docExecuted/i);
  });


  it("within fails if anchor event missing", () => {
    const store = storeFrom([{ key: "agreement.doc_987.executed", occurredAt: "2026-01-03T00:00:00Z" }]);

    const rule: Condition = {
      type: "within",
      eventKey: { ref: "docExecuted" },
      anchorKey: { ref: "docReceived" },
      duration: "P3D",
    };

    const res = evaluate(rule, bindings, store);
    expect(res.pass).toBe(false);
    expect(res.reasons.join(" ")).toMatch(/Missing anchor event/i);
  });
});
