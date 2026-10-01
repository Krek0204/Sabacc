import { describe, expect, test } from 'vitest';
import { getNumericCardAsset } from './getNumericCardAsset';

describe('getNumericCardAsset', () => {
  const faces = { 1: 'face-1', 2: 'face-2', 6: 'face-6' };

  test('returns face for value 1', () => {
    expect(getNumericCardAsset(faces, 1)).toBe('face-1');
  });

  test('returns undefined when value is missing', () => {
    expect(getNumericCardAsset(faces, undefined)).toBeUndefined();
    expect(getNumericCardAsset(faces, null)).toBeUndefined();
  });
});
