import { describe, it, expect } from 'vitest'

import isAttributeEqual from '../../src/lib/isAttributeEqual'

describe('isAttributeEqual', () => {
  it('matches primitive equality behavior', () => {
    expect(isAttributeEqual('a', 'a')).toBe(true);
    expect(isAttributeEqual('a', 'b')).toBe(false);
    expect(isAttributeEqual(NaN, NaN)).toBe(true);
  });

  it('deep-compares normal objects and arrays', () => {
    const a = { name: 'dan', tags: ['a', 'b'], nested: { count: 1 } };
    const b = { name: 'dan', tags: ['a', 'b'], nested: { count: 1 } };
    const c = { name: 'dan', tags: ['a', 'b'], nested: { count: 2 } };

    expect(isAttributeEqual(a, b)).toBe(true);
    expect(isAttributeEqual(a, c)).toBe(false);
  });

  it('compares record-like objects only by id/type', () => {
    const a = { id: '1', type: 'users', attributes: { name: 'dan' } };
    const b = { id: '1', type: 'users', attributes: { name: 'matt' } };
    const c = { id: '2', type: 'users', attributes: { name: 'dan' } };

    expect(isAttributeEqual(a, b)).toBe(true);
    expect(isAttributeEqual(a, c)).toBe(false);
  });

  it('applies record-like comparison recursively inside structures', () => {
    const a = {
      owners: [
        { id: '1', type: 'users', attributes: { name: 'dan' } },
      ],
    };
    const b = {
      owners: [
        { id: '1', type: 'users', attributes: { name: 'matt' } },
      ],
    };
    const c = {
      owners: [
        { id: '2', type: 'users', attributes: { name: 'matt' } },
      ],
    };

    expect(isAttributeEqual(a, b)).toBe(true);
    expect(isAttributeEqual(a, c)).toBe(false);
  });

  it('returns false when only one side is record-like', () => {
    expect(isAttributeEqual({ id: '1', type: 'users' }, { id: '1' })).toBe(false);
    expect(isAttributeEqual({ id: '1' }, { id: '1', type: 'users' })).toBe(false);
  });
});
