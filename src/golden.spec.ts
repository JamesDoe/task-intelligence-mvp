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

describe("Golden semantics (DB-free)", () => {
    it("within passes when event occurs exactly at anchor+duration (inclusive deadline)", () => {
        const store = storeFrom([
            { key: "agreement.doc_987.received", occurredAt: "2026-01-01T00:00:00Z" },
            { key: "agreement.doc_987.executed", occurredAt: "2026-01-04T00:00:00Z" }, // +3 days
        ]);

        const rule: Condition = {
            type: "within",
            eventKey: { ref: "docExecuted" },
            anchorKey: { ref: "docReceived" },
            duration: "P3D",
        };

        expect(evaluate(rule, bindings, store).pass).toBe(true);
    });

    it("within fails when event occurs after anchor+duration", () => {
        const store = storeFrom([
            { key: "agreement.doc_987.received", occurredAt: "2026-01-01T00:00:00Z" },
            { key: "agreement.doc_987.executed", occurredAt: "2026-01-05T00:00:01Z" }, // just after +4 days
        ]);

        const rule: Condition = {
            type: "within",
            eventKey: { ref: "docExecuted" },
            anchorKey: { ref: "docReceived" },
            duration: "P3D",
        };

        expect(evaluate(rule, bindings, store).pass).toBe(false);
    });

    it("multiple occurrences: selects the first executed on/after received", () => {
        const store = storeFrom([
            { key: "agreement.doc_987.received", occurredAt: "2026-01-02T00:00:00Z" },

            // before anchor: should be ignored
            { key: "agreement.doc_987.executed", occurredAt: "2026-01-01T00:00:00Z" },

            // after anchor: earliest after anchor should be chosen
            { key: "agreement.doc_987.executed", occurredAt: "2026-01-03T00:00:00Z" },
            { key: "agreement.doc_987.executed", occurredAt: "2026-01-04T00:00:00Z" },
        ]);

        const rule: Condition = {
            type: "within",
            eventKey: { ref: "docExecuted" },
            anchorKey: { ref: "docReceived" },
            duration: "P3D",
        };

        expect(evaluate(rule, bindings, store).pass).toBe(true);
    });


    it("all: fails if any required condition fails", () => {
        const store = storeFrom([{ key: "agreement.doc_987.received", occurredAt: "2026-01-02T00:00:00Z" }]);

        const rule: Condition = {
            type: "all",
            conditions: [
                { type: "occurred", eventKey: { ref: "docReceived" } },
                { type: "occurred", eventKey: { ref: "docExecuted" } },
            ],
        };

        const res = evaluate(rule, bindings, store);
        expect(res.pass).toBe(false);
    });

    it("any: passes if one alternative path is satisfied", () => {
        const store = storeFrom([{ key: "buyer.opted_out", occurredAt: "2026-01-02T00:00:00Z" }]);

        const rule: Condition = {
            type: "any",
            conditions: [
                { type: "occurred", eventKey: "buyer.completed_intake" },
                { type: "occurred", eventKey: "buyer.opted_out" },
            ],
        };

        expect(evaluate(rule, bindings, store).pass).toBe(true);
    });

    it("not: fails when the negated condition is true", () => {
        const store = storeFrom([{ key: "inspection.cancelled", occurredAt: "2026-01-02T00:00:00Z" }]);

        const rule: Condition = {
            type: "not",
            condition: { type: "occurred", eventKey: "inspection.cancelled" },
        };

        expect(evaluate(rule, bindings, store).pass).toBe(false);
    });

    it("UTC integrity: evaluation behaves correctly across midnight Z", () => {
        const store = storeFrom([
            { key: "agreement.doc_987.received", occurredAt: "2026-01-01T23:00:00Z" },
            { key: "agreement.doc_987.executed", occurredAt: "2026-01-02T00:30:00Z" },
        ]);

        const rule: Condition = {
            type: "within",
            eventKey: { ref: "docExecuted" },
            anchorKey: { ref: "docReceived" },
            duration: "P1D",
        };

        expect(evaluate(rule, bindings, store).pass).toBe(true);
    });

    it("within uses first event on/after anchor (ignores executed before received)", () => {
        const store = storeFrom([
            // executed happens before received — should be ignored
            { key: "agreement.doc_987.executed", occurredAt: "2026-01-01T00:00:00Z" },

            // anchor (received)
            { key: "agreement.doc_987.received", occurredAt: "2026-01-02T00:00:00Z" },

            // executed after received — should be selected
            { key: "agreement.doc_987.executed", occurredAt: "2026-01-03T00:00:00Z" },
        ]);

        const rule: Condition = {
            type: "within",
            eventKey: { ref: "docExecuted" },
            anchorKey: { ref: "docReceived" },
            duration: "P3D",
        };

        const res = evaluate(rule, bindings, store);
        expect(res.pass).toBe(true);
    });

    it("within fails if no event occurs on/after anchor (executed-before-anchor doesn't count)", () => {
        const store = storeFrom([
            { key: "agreement.doc_987.executed", occurredAt: "2026-01-01T00:00:00Z" },
            { key: "agreement.doc_987.received", occurredAt: "2026-01-02T00:00:00Z" },
        ]);

        const rule: Condition = {
            type: "within",
            eventKey: { ref: "docExecuted" },
            anchorKey: { ref: "docReceived" },
            duration: "P3D",
        };

        const res = evaluate(rule, bindings, store);
        expect(res.pass).toBe(false);
        expect(res.reasons.join(" ")).toMatch(/on\/after anchor/i);
    });

    it("within ignores executed-before-anchor and uses first executed after anchor", () => {
        const store = storeFrom([
            { key: "agreement.doc_987.executed", occurredAt: "2026-01-01T00:00:00Z" }, // ignored
            { key: "agreement.doc_987.received", occurredAt: "2026-01-02T00:00:00Z" },
            { key: "agreement.doc_987.executed", occurredAt: "2026-01-03T00:00:00Z" }, // selected
        ]);

        const rule: Condition = {
            type: "within",
            eventKey: { ref: "docExecuted" },
            anchorKey: { ref: "docReceived" },
            duration: "P3D",
        };

        expect(evaluate(rule, bindings, store).pass).toBe(true);
    });


});
