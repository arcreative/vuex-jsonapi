import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineJsonapiStore } from '../../src/extensions/pinia-store.js'
import Store from '../../src/core/store.js'
import Record from '../../src/core/record.js'
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

  describe('save', () => {
    it('emits didSaveRecord and didCreateRecord for a non-persisted record', async () => {
      const { coreStore, emitter, apiClient } = makeMocks()
      const record = new Record('articles')
      // _persisted defaults to false in new Record()
      const saved = Object.assign(new Record('articles'), { id: '42', _persisted: true })
      apiClient.save.mockResolvedValue(saved)

      const didSaveRecord = vi.fn()
      const didCreateRecord = vi.fn()
      const didUpdateRecord = vi.fn()
      const didUpdateArticles = vi.fn()
      emitter.on('didSaveRecord', didSaveRecord)
      emitter.on('didCreateRecord', didCreateRecord)
      emitter.on('didUpdateRecord', didUpdateRecord)
      emitter.on('didUpdateArticles', didUpdateArticles)

      const useStore = defineJsonapiStore('save-new', apiClient, coreStore, emitter)
      const store = useStore()

      await store.save({ record })

      expect(apiClient.save).toHaveBeenCalledWith(record, { params: {} })
      expect(didSaveRecord).toHaveBeenCalledWith({ record: saved, suppress: false })
      expect(didCreateRecord).toHaveBeenCalledWith({ record: saved, suppress: false })
      expect(didUpdateRecord).not.toHaveBeenCalled()
      expect(didUpdateArticles).toHaveBeenCalledWith({ record: saved })
    })

    it('emits didUpdateRecord (not didCreateRecord) for a persisted record', async () => {
      const { coreStore, emitter, apiClient } = makeMocks()
      const record = Object.assign(new Record('articles'), { id: '1', _persisted: true })
      const saved = Object.assign(new Record('articles'), { id: '1', _persisted: true })
      apiClient.save.mockResolvedValue(saved)

      const didCreateRecord = vi.fn()
      const didUpdateRecord = vi.fn()
      emitter.on('didCreateRecord', didCreateRecord)
      emitter.on('didUpdateRecord', didUpdateRecord)

      const useStore = defineJsonapiStore('save-existing', apiClient, coreStore, emitter)
      const store = useStore()

      await store.save({ record })

      expect(didUpdateRecord).toHaveBeenCalledWith({ record: saved, suppress: false })
      expect(didCreateRecord).not.toHaveBeenCalled()
    })

    it('emits didSaveError on failure', async () => {
      const { coreStore, emitter, apiClient } = makeMocks()
      const record = new Record('articles')
      apiClient.save.mockRejectedValue(new Error('Server error'))

      const didSaveError = vi.fn()
      emitter.on('didSaveError', didSaveError)

      const useStore = defineJsonapiStore('save-error', apiClient, coreStore, emitter)
      const store = useStore()

      await store.save({ record })

      expect(didSaveError).toHaveBeenCalled()
      const payload = didSaveError.mock.calls[0][0]
      expect(payload.record).toBe(record)
    })
  })

  describe('deleteRecord', () => {
    it('emits didDeleteRecord and didUpdate{Type} on success', async () => {
      const { coreStore, emitter, apiClient } = makeMocks()
      const record = Object.assign(new Record('articles'), { id: '7', _persisted: true })
      apiClient.delete.mockResolvedValue()

      const didDeleteRecord = vi.fn()
      const didUpdateArticles = vi.fn()
      emitter.on('didDeleteRecord', didDeleteRecord)
      emitter.on('didUpdateArticles', didUpdateArticles)

      const useStore = defineJsonapiStore('delete-ok', apiClient, coreStore, emitter)
      const store = useStore()

      await store.deleteRecord({ record })

      expect(apiClient.delete).toHaveBeenCalledWith(record)
      expect(didDeleteRecord).toHaveBeenCalledWith({ record, suppress: false })
      expect(didUpdateArticles).toHaveBeenCalledWith({ record })
    })

    it('emits didDeleteError on failure', async () => {
      const { coreStore, emitter, apiClient } = makeMocks()
      const record = Object.assign(new Record('articles'), { id: '8', _persisted: true })
      apiClient.delete.mockRejectedValue(new Error('Delete failed'))

      const didDeleteError = vi.fn()
      emitter.on('didDeleteError', didDeleteError)

      const useStore = defineJsonapiStore('delete-error', apiClient, coreStore, emitter)
      const store = useStore()

      await store.deleteRecord({ record })

      expect(didDeleteError).toHaveBeenCalled()
      const payload = didDeleteError.mock.calls[0][0]
      expect(payload.record).toBe(record)
    })
  })

  describe('materialize', () => {
    it('calls coreStore.materializeRecords and populates the channel', () => {
      const { coreStore, emitter, apiClient } = makeMocks()
      const rawRecords = [{ id: '1', type: 'articles', attributes: {} }]
      const materialized = [Object.assign(new Record('articles'), { id: '1' })]
      vi.spyOn(coreStore, 'materializeRecords').mockReturnValue(materialized)

      const useStore = defineJsonapiStore('materialize-test', apiClient, coreStore, emitter)
      const store = useStore()

      store.materialize({ records: rawRecords, channel: 'main' })

      expect(coreStore.materializeRecords).toHaveBeenCalledWith(rawRecords)
      expect(store.channel('main')).toEqual(materialized)
    })
  })
})
