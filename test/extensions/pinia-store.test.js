import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineJsonapiStore } from '../../src/extensions/pinia-store.js'
import Store from '../../src/core/store.js'
import EventEmitter from '../../src/support/event-emitter.js'

function makeMocks() {
  const coreStore = new Store({})
  const emitter = new EventEmitter()
  const apiClient = {
    find: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  }
  return { coreStore, emitter, apiClient }
}

describe('defineJsonapiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns a usable store composable', () => {
    const { coreStore, emitter, apiClient } = makeMocks()
    const useStore = defineJsonapiStore('test', apiClient, coreStore, emitter)
    const store = useStore()
    expect(store).toBeDefined()
  })

  it('find sets loading and populates channel on success', async () => {
    const { coreStore, emitter, apiClient } = makeMocks()
    const records = [{ id: '1', type: 'articles' }]
    records.meta = { record_count: 1 }
    apiClient.find.mockResolvedValue(records)

    const useStore = defineJsonapiStore('test2', apiClient, coreStore, emitter)
    const store = useStore()

    await store.find({ channel: 'list', type: 'articles', id: null, params: {} })

    expect(store.channel('list')).toEqual(records)
    expect(store.isLoading('list')).toBe(false)
    expect(store.hasNoRecords('list')).toBe(false)
  })

  it('find sets error and emits didFindError on failure', async () => {
    const { coreStore, emitter, apiClient } = makeMocks()
    const err = new Error('Network error')
    apiClient.find.mockRejectedValue(err)

    const errorListener = vi.fn()
    emitter.on('didFindError', errorListener)

    const useStore = defineJsonapiStore('test3', apiClient, coreStore, emitter)
    const store = useStore()

    await store.find({ channel: 'list', type: 'articles', id: null, params: {} })

    expect(store.getError('list')).toBeDefined()
    expect(errorListener).toHaveBeenCalled()
  })

  it('clear resets all channel state', async () => {
    const { coreStore, emitter, apiClient } = makeMocks()
    const records = []
    records.meta = {}
    apiClient.find.mockResolvedValue(records)

    const useStore = defineJsonapiStore('test4', apiClient, coreStore, emitter)
    const store = useStore()

    await store.find({ channel: 'list', type: 'articles', id: null, params: {} })
    store.clear({ channel: 'list' })

    expect(store.channel('list')).toBeNull()
    expect(store.getError('list')).toBeNull()
    expect(store.isLoading('list')).toBeNull()
  })
})
