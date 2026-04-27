import { describe, it, expect } from 'vitest'

import deepClone from '../../src/lib/deepClone'

describe('deepClone', () => {
  it('deep clones nested objects and arrays', () => {
    const original = {
      profile: {
        name: 'dan',
        tags: ['a', 'b'],
      },
    };

    const cloned = deepClone(original);
    cloned.profile.name = 'matt';
    cloned.profile.tags[0] = 'z';

    expect(original.profile.name).toBe('dan');
    expect(original.profile.tags[0]).toBe('a');
  });

  it('clones Date instances by value', () => {
    const original = { at: new Date('2026-01-01T00:00:00.000Z') };
    const cloned = deepClone(original);

    expect(cloned.at).not.toBe(original.at);
    expect(cloned.at.getTime()).toBe(original.at.getTime());
  });

  it('returns primitives and non-plain objects as-is', () => {
    const fn = () => {};
    expect(deepClone(1)).toBe(1);
    expect(deepClone('x')).toBe('x');
    expect(deepClone(fn)).toBe(fn);
  });
});
