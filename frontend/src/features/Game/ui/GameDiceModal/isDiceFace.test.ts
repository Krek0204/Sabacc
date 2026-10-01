import { describe, expect, test } from 'vitest';
import { isDiceFace } from './isDiceFace';

describe('isDiceFace', () => {
  test('accepts all faces including 1', () => {
    expect([1, 2, 3, 4, 5, 6].every(isDiceFace)).toBe(true);
  });

  test('rejects 0, negatives, non-integers and out of range', () => {
    expect(isDiceFace(0)).toBe(false);
    expect(isDiceFace(-1)).toBe(false);
    expect(isDiceFace(7)).toBe(false);
    expect(isDiceFace(1.5)).toBe(false);
    expect(isDiceFace(NaN)).toBe(false);
  });
});
