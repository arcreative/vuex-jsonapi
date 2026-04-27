import { describe, it, expect } from 'vitest'

import Record from '../../src/core/record'

describe('Record', () => {
  it('materialize deep-clones payload into _data', () => {
    const payload = {
      id: '1',
      type: 'users',
      attributes: {
        profile: {
          name: 'dan',
        },
      },
      relationships: {},
      meta: {},
    };

    const record = new Record('users');
    record.materialize(payload);

    payload.attributes.profile.name = 'matt';

    expect(record._data.attributes.profile.name).toBe('dan');
  });

  it('clone detaches _data references from original record', () => {
    const record = new Record('users');
    record.materialize({
      id: '1',
      type: 'users',
      attributes: {
        profile: {
          name: 'dan',
        },
      },
      relationships: {},
      meta: {},
    });

    const copy = record.clone();
    copy._data.attributes.profile.name = 'matt';

    expect(record._data.attributes.profile.name).toBe('dan');
    expect(copy._data.attributes.profile.name).toBe('matt');
  });

  it('dirtyAttributes ignores underscore-prefixed properties', () => {
    const record = new Record('users');
    record.materialize({
      id: '1',
      type: 'users',
      attributes: {
        name: 'dan',
      },
      relationships: {},
      meta: {},
    });

    record._localOnly = { changed: true };

    expect(record.dirtyAttributes()).not.toContain('_localOnly');
  });

  it('treats record-like attributes as equal when id/type match', () => {
    const record = new Record('posts');
    record.materialize({
      id: '10',
      type: 'posts',
      attributes: {
        author: {
          id: '1',
          type: 'users',
          attributes: {
            name: 'dan',
          },
        },
      },
      relationships: {},
      meta: {},
    });

    record.author = {
      id: '1',
      type: 'users',
      attributes: {
        name: 'matt',
      },
    };

    expect(record.dirtyAttributes()).not.toContain('author');
  });

  it('treats record-like attributes as dirty when id/type differ', () => {
    const record = new Record('posts');
    record.materialize({
      id: '10',
      type: 'posts',
      attributes: {
        author: {
          id: '1',
          type: 'users',
        },
      },
      relationships: {},
      meta: {},
    });

    record.author = {
      id: '2',
      type: 'users',
    };

    expect(record.dirtyAttributes()).toContain('author');
  });

  it('treats has-many relationships as order-insensitive', () => {
    const record = new Record('posts');
    record.materialize({
      id: '10',
      type: 'posts',
      attributes: {},
      relationships: {
        authors: {
          data: [
            { id: '1', type: 'users' },
            { id: '2', type: 'users' },
          ],
        },
      },
      meta: {},
    });

    record.authors = [
      { id: '2', type: 'users' },
      { id: '1', type: 'users' },
    ];

    expect(record.dirtyAttributes()).not.toContain('authors');
  });

  it('marks has-many relationships dirty when ids differ', () => {
    const record = new Record('posts');
    record.materialize({
      id: '10',
      type: 'posts',
      attributes: {},
      relationships: {
        authors: {
          data: [{ id: '1', type: 'users' }],
        },
      },
      meta: {},
    });

    record.authors = [{ id: '2', type: 'users' }];

    expect(record.dirtyAttributes()).toContain('authors');
  });

  it('marks unloaded relationships dirty only when set locally', () => {
    const record = new Record('posts');
    record.materialize({
      id: '10',
      type: 'posts',
      attributes: {},
      relationships: {
        reviewer: {
          data: undefined,
        },
      },
      meta: {},
    });

    expect(record.dirtyAttributes()).not.toContain('reviewer');

    record.reviewer = { id: '5', type: 'users' };
    expect(record.dirtyAttributes()).toContain('reviewer');
  });
});
