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

  it('preserves circular object references', () => {
    const original = { name: 'root' };
    original.self = original;

    const cloned = deepClone(original);

    expect(cloned).not.toBe(original);
    expect(cloned.name).toBe('root');
    expect(cloned.self).toBe(cloned);
  });

  it('preserves nested circular references across objects and arrays', () => {
    const original = {
      items: [],
      child: {},
    };

    original.items.push(original.child);
    original.child.parent = original;
    original.child.items = original.items;

    const cloned = deepClone(original);

    expect(cloned).not.toBe(original);
    expect(cloned.child).not.toBe(original.child);
    expect(cloned.items).not.toBe(original.items);
    expect(cloned.items[0]).toBe(cloned.child);
    expect(cloned.child.parent).toBe(cloned);
    expect(cloned.child.items).toBe(cloned.items);
  });
});
