import type { Atom } from "./types";

export type Condition =
  | { type: "occurred"; eventKey: Atom }
  | { type: "within"; eventKey: Atom; anchorKey: Atom; duration: Atom } // duration can be "P3D" or {ref:"signingWindow"}
  | { type: "all"; conditions: Condition[] }
  | { type: "any"; conditions: Condition[] }
  | { type: "not"; condition: Condition };
