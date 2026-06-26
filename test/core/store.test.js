import { describe, it, expect } from 'vitest'
import Store from '../../src/core/store.js'
import Record from '../../src/core/record.js'

describe('Store', () => {
  it('constructs without a Vue argument', () => {
    const store = new Store({})
    expect(store).toBeDefined()
  })

  it('getRecord creates and caches a record', () => {
    const store = new Store({})
    const record = store.getRecord('articles', '1')
    expect(record).toBeInstanceOf(Record)
    expect(store.getRecord('articles', '1')).toBe(record)
  })

  it('hydrateRecord sets relationship properties without Vue.set', () => {
    const store = new Store({})
    const raw = {
      id: '1',
      type: 'articles',
      attributes: { title: 'Hello' },
      relationships: {
        author: { data: { type: 'people', id: '9' } }
      }
    }
    store.getRecord('people', '9')
    const record = store.getRecord('articles', '1')
    record.materialize(raw)
    store.hydrateRecord(record)
    expect(record.title).toBe('Hello')
    expect(record.author).toBeInstanceOf(Record)
    expect(record.author.id).toBe('9')
  })
})
