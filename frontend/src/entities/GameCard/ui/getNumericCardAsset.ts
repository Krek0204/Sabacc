/** Card ranks include 1; do not use truthy checks — `1` is falsy in JS. */
export function getNumericCardAsset(
  faces: Record<number, string>,
  value: number | null | undefined,
): string | undefined {
  if (value == null) {
    return undefined;
  }

  return faces[value];
}
