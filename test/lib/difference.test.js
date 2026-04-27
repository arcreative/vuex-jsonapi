import { describe, it, expect } from 'vitest'

import difference from '../../src/lib/difference'

describe('difference', () => {
  it('returns values present only in the first array', () => {
    expect(difference([1, 2, 3], [2, 4])).toEqual([1, 3]);
  });

  it('returns empty array when all values are present in second array', () => {
    expect(difference(['a', 'b'], ['a', 'b', 'c'])).toEqual([]);
  });

  it('preserves duplicate values from first array when absent in second', () => {
    expect(difference([1, 1, 2], [2])).toEqual([1, 1]);
  });
});
