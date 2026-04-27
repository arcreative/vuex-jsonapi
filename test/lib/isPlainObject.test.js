import { describe, it, expect } from 'vitest'

import isPlainObject from '../../src/lib/isPlainObject'

describe('isPlainObject', () => {
  it('returns true for plain object literals', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
  });

  it('returns true for null-prototype plain objects', () => {
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  it('returns false for null and primitives', () => {
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
    expect(isPlainObject('x')).toBe(false);
    expect(isPlainObject(1)).toBe(false);
    expect(isPlainObject(true)).toBe(false);
  });

  it('returns false for arrays, dates, and functions', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(new Date())).toBe(false);
    expect(isPlainObject(() => {})).toBe(false);
  });
});
