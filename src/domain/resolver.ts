import type { Atom, Bindings } from "./types";

export type ResolveOk = { ok: true; value: string };
export type ResolveErr = { ok: false; ref: string };
export type ResolveResult = ResolveOk | ResolveErr;

export function tryResolveAtom(atom: Atom, bindings: Bindings): ResolveResult {
  if (typeof atom === "string") return { ok: true, value: atom };

  const v = bindings[atom.ref];
  if (!v) return { ok: false, ref: atom.ref };
  return { ok: true, value: v };
}

// Optional: keep strict resolver for dev/debug if we need it later.
// Not used by the evaluator in deterministic mode.
export function resolveAtom(atom: Atom, bindings: Bindings): string {
  const r = tryResolveAtom(atom, bindings);
  if (!r.ok) throw new Error(`Missing binding: ${r.ref}`);
  return r.value;
}
