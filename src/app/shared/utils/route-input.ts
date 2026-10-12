/**
 * withComponentInputBinding() sets routed inputs to `undefined` when a route doesn't provide them,
 * which would wipe an input's default. Use as `input(def, { transform: orDefault(def) })`.
 */
export const orDefault =
  <T>(fallback: T) =>
  (value: T | undefined | null): T =>
    value ?? fallback;
