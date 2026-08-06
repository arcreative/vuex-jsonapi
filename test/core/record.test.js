import { describe, it, expect } from 'vitest'

import Record from '../../src/core/record'
import Store from '../../src/core/store'

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

  it('re-cloning after discarding an edited clone does not leak nested object attribute edits', () => {
    const record = new Record('users');
    record.materialize({
      id: '1',
      type: 'users',
      attributes: {
        configuration: {
          notifications: {
            email: true,
            sms: false,
          },
        },
      },
      relationships: {},
      meta: {},
    });

    // Simulate hydrated top-level attribute as done by Store.hydrateRecord.
    record.configuration = {
      notifications: {
        email: true,
        sms: false,
      },
    };

    const firstClone = record.clone();
    firstClone.configuration.notifications.sms = true;

    const secondClone = record.clone();
    expect(secondClone.configuration.notifications.sms).toBe(false);
  });

  it('clone keeps belongs-to relationships by reference when configured on the store', () => {
    const store = new Store({ set: (object, key, value) => { object[key] = value; } }, {}, {
      relationshipsForType: {
        posts: ['author'],
      },
    });
    const post = store.getRecord('posts', '10');
    const author = store.getRecord('users', '1');

    post.author = author;

    const copy = post.clone();

    expect(copy.author).toBe(author);
  });

  it('clone detaches has-many relationship arrays but preserves members when configured on the store', () => {
    const store = new Store({ set: (object, key, value) => { object[key] = value; } }, {}, {
      relationshipsForType: {
        posts: ['comments'],
      },
    });
    const post = store.getRecord('posts', '10');
    const commentA = store.getRecord('comments', '1');
    const commentB = store.getRecord('comments', '2');

    post.comments = [commentA, commentB];

    const copy = post.clone();

    expect(copy.comments).not.toBe(post.comments);
    expect(copy.comments).toEqual(post.comments);
    expect(copy.comments[0]).toBe(commentA);
    expect(copy.comments[1]).toBe(commentB);
  });

  it('clone still deep-clones plain array attributes', () => {
    const store = new Store({ set: (object, key, value) => { object[key] = value; } }, {}, {
      relationshipsForType: {
        posts: ['comments'],
      },
    });
    const post = store.getRecord('posts', '10');

    post.tags = [{ name: 'alpha' }];

    const copy = post.clone();
    copy.tags[0].name = 'beta';

    expect(copy.tags).not.toBe(post.tags);
    expect(post.tags[0].name).toBe('alpha');
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
