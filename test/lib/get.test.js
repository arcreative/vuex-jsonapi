import { describe, it, expect } from 'vitest'

import get from '../../src/lib/get'

describe('get', () => {
  const payload = {
    user: {
      profile: {
        name: 'dan',
      },
      roles: [
        { id: 1, title: 'admin' },
        { id: 2, title: 'editor' },
      ],
    },
  };

  it('reads nested values via dot path', () => {
    expect(get(payload, 'user.profile.name')).toBe('dan');
  });

  it('reads nested values via bracket path', () => {
    expect(get(payload, 'user.roles[1].title')).toBe('editor');
  });

  it('returns default when path is missing', () => {
    expect(get(payload, 'user.profile.email', 'none')).toBe('none');
  });

  it('returns default when target object is nullish', () => {
    expect(get(null, 'user.profile.name', 'none')).toBe('none');
  });
});
