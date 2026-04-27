import { describe, it, expect } from 'vitest'

import isRecordReference from '../../src/lib/isRecordReference'

describe('isRecordReference', () => {
  it('returns true for plain object with id and type', () => {
    expect(isRecordReference({ id: '1', type: 'users' })).toBe(true);
  });

  it('returns true even when id/type are null', () => {
    expect(isRecordReference({ id: null, type: null })).toBe(true);
  });

  it('returns false when id is missing', () => {
    expect(isRecordReference({ type: 'users' })).toBe(false);
  });

  it('returns false when type is missing', () => {
    expect(isRecordReference({ id: '1' })).toBe(false);
  });

  it('returns false for arrays and non-objects', () => {
    expect(isRecordReference(['1', 'users'])).toBe(false);
    expect(isRecordReference('users:1')).toBe(false);
    expect(isRecordReference(null)).toBe(false);
  });
});
