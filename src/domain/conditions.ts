import { EvaluationContext, EvaluationResult } from "./types";

export type Condition =
  | { type: "occurred"; eventKey: string }
  | {
      type: "within";
      eventKey: string;
      anchorKey: string;
      durationMs: number;
    }
  | { type: "all"; conditions: Condition[] }
  | { type: "any"; conditions: Condition[] }
  | { type: "not"; condition: Condition };
