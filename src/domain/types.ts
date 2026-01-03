export type IsoUtc = string; // "2026-01-02T15:30:00Z"

export type Event = {
  key: string;
  occurredAt: IsoUtc;
};

export type EventStore = {
  getEventsByKey: (key: string) => Event[];
};

export type Bindings = Record<string, string>;

// Binding-aware atom: either a literal value or a reference that must be resolved via bindings
export type Atom = string | { ref: string };

export type EvaluationResult = {
  pass: boolean;
  reasons: string[];
  evidence?: Array<{ key: string; occurredAt?: IsoUtc }>;
};
