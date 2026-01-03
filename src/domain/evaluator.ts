import { Condition } from "./conditions";
import { EvaluationContext, EvaluationResult } from "./types";

export function evaluate(
  condition: Condition,
  ctx: EvaluationContext
): EvaluationResult {
  switch (condition.type) {
    case "occurred": {
      const events = ctx.getEventsByKey(condition.eventKey);
      return {
        pass: events.length > 0,
        reasons: events.length
          ? []
          : [`Event ${condition.eventKey} did not occur`],
      };
    }

    case "within": {
      const anchor = ctx.getEventsByKey(condition.anchorKey)[0];
      const event = ctx.getEventsByKey(condition.eventKey)[0];

      if (!anchor || !event) {
        return {
          pass: false,
          reasons: ["Missing anchor or event"],
        };
      }

      const deadline =
        new Date(anchor.occurredAt).getTime() + condition.durationMs;
      const occurred = new Date(event.occurredAt).getTime();

      return {
        pass: occurred <= deadline,
        reasons:
          occurred <= deadline
            ? []
            : [`Event ${condition.eventKey} missed deadline`],
      };
    }

    case "all": {
      const results = condition.conditions.map((c) => evaluate(c, ctx));
      return {
        pass: results.every((r) => r.pass),
        reasons: results.flatMap((r) => r.reasons),
      };
    }

    case "any": {
      const results = condition.conditions.map((c) => evaluate(c, ctx));
      return {
        pass: results.some((r) => r.pass),
        reasons: results.every((r) => !r.pass)
          ? results.flatMap((r) => r.reasons)
          : [],
      };
    }

    case "not": {
      const result = evaluate(condition.condition, ctx);
      return {
        pass: !result.pass,
        reasons: result.pass ? ["Negated condition passed"] : [],
      };
    }
  }
}
