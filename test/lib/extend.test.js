import { describe, it, expect } from 'vitest'

import extend from '../../src/lib/extend'

describe('extend', () => {
  it('mutates target with source keys and returns the target', () => {
    const target = { a: 1 };
    const result = extend(target, { b: 2 });

    expect(result).toBe(target);
    expect(target).toEqual({ a: 1, b: 2 });
  });

  it('applies later sources over earlier ones', () => {
    const target = { a: 1, b: 1 };
    extend(target, { b: 2 }, { b: 3, c: 4 });
    expect(target).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('returns target unchanged when no sources are given', () => {
    const target = { a: 1 };
    expect(extend(target)).toBe(target);
    expect(target).toEqual({ a: 1 });
  });
});
