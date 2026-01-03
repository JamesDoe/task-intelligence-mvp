import type { Bindings, EventStore, EvaluationResult, IsoUtc } from "./types";
import type { Condition } from "./conditions";
import { tryResolveAtom } from "./resolver";

function earliest<T extends { occurredAt: IsoUtc }>(events: T[]): T | undefined {
  return events.slice().sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))[0];
}

function firstOnOrAfter<T extends { occurredAt: IsoUtc }>(events: T[], anchorAt: IsoUtc): T | undefined {
  return events
    .filter((e) => e.occurredAt >= anchorAt)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))[0];
}

// MVP duration support: P<n>D only (days). Expand later.
function parseDurationMs(isoDuration: string): number {
  const m = /^P(\d+)D$/.exec(isoDuration);
  if (!m) throw new Error(`Unsupported duration in MVP: ${isoDuration}`);
  const days = Number(m[1]);
  return days * 24 * 60 * 60 * 1000;
}

function unbound(ref: string): EvaluationResult {
  return {
    pass: false,
    reasons: [`Unbound reference: ${ref}`],
    evidence: [{ key: `ref:${ref}` }],
  };
}

export function evaluate(condition: Condition, bindings: Bindings, store: EventStore): EvaluationResult {
  switch (condition.type) {
    case "occurred": {
      const rk = tryResolveAtom(condition.eventKey, bindings);
      if (!rk.ok) return unbound(rk.ref);
      const key = rk.value;

      const events = store.getEventsByKey(key);
      const e = earliest(events);
      if (!e) return { pass: false, reasons: [`Missing event: ${key}`], evidence: [{ key }] };

      return { pass: true, reasons: [`Event present: ${key}`], evidence: [{ key, occurredAt: e.occurredAt }] };
    }

    case "within": {
      const rEvent = tryResolveAtom(condition.eventKey, bindings);
      if (!rEvent.ok) return unbound(rEvent.ref);

      const rAnchor = tryResolveAtom(condition.anchorKey, bindings);
      if (!rAnchor.ok) return unbound(rAnchor.ref);

      const rDur = tryResolveAtom(condition.duration, bindings);
      if (!rDur.ok) return unbound(rDur.ref);

      const eventKey = rEvent.value;
      const anchorKey = rAnchor.value;
      const durationIso = rDur.value;

      const anchorEvents = store.getEventsByKey(anchorKey);
      const eventEvents = store.getEventsByKey(eventKey);

      const a = earliest(anchorEvents);
      if (!a) return { pass: false, reasons: [`Missing anchor event: ${anchorKey}`], evidence: [{ key: anchorKey }] };

      const e = firstOnOrAfter(eventEvents, a.occurredAt);
      if (!e) {
        return {
          pass: false,
          reasons: [`Missing event: ${eventKey} on/after anchor: ${anchorKey}`],
          evidence: [{ key: anchorKey, occurredAt: a.occurredAt }, { key: eventKey }],
        };
      }

      const deadlineMs = new Date(a.occurredAt).getTime() + parseDurationMs(durationIso);
      const eventMs = new Date(e.occurredAt).getTime();
      const pass = eventMs <= deadlineMs;

      return {
        pass,
        reasons: pass
          ? [`${eventKey} occurred within ${durationIso} of ${anchorKey}`]
          : [`${eventKey} occurred after deadline (${durationIso} from ${anchorKey})`],
        evidence: [
          { key: anchorKey, occurredAt: a.occurredAt },
          { key: eventKey, occurredAt: e.occurredAt },
        ],
      };
    }

    case "all": {
      const results = condition.conditions.map((c) => evaluate(c, bindings, store));
      const pass = results.every((r) => r.pass);
      return {
        pass,
        reasons: pass ? ["All conditions satisfied"] : ["One or more conditions failed"],
        evidence: results.flatMap((r) => r.evidence ?? []),
      };
    }

    case "any": {
      const results = condition.conditions.map((c) => evaluate(c, bindings, store));
      const pass = results.some((r) => r.pass);
      return {
        pass,
        reasons: pass ? ["At least one condition satisfied"] : ["No conditions satisfied"],
        evidence: results.flatMap((r) => r.evidence ?? []),
      };
    }

    case "not": {
      const r = evaluate(condition.condition, bindings, store);
      return {
        pass: !r.pass,
        reasons: !r.pass ? ["Negated condition is false (pass)"] : ["Negated condition is true (fail)"],
        evidence: r.evidence,
      };
    }
  }
}
