export type Event = {
  key: string;
  occurredAt: string; // ISO 8601 UTC Z
};

export type EvaluationContext = {
  getEventsByKey: (key: string) => Event[];
};

export type EvaluationResult = {
  pass: boolean;
  reasons: string[];
};
