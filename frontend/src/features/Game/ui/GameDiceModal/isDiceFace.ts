/** Dice faces are 1–6; do not use truthy checks — `1` is falsy in JS. */
export function isDiceFace(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 6;
}
