import { ref } from 'vue'
import { defineStore } from 'pinia'
import get from 'lodash-es/get'
import pickBy from 'lodash-es/pickBy'

import RequestError from '../support/request-error'

export function defineJsonapiStore(id, apiClient, coreStore, emitter) {
  return defineStore(id, () => {
    const channels = ref({})
    const error = ref({})
    const loading = ref({})
    const meta = ref({})
    const moreRecords = ref({})
    const noRecords = ref({})

    function channel(ch) { return channels.value[ch] ?? null }
    function getError(ch) { return error.value[ch] ?? null }
    function isLoading(ch) { return loading.value[ch] ?? null }
    function getMeta(ch) { return meta.value[ch] ?? null }
    function hasMoreRecords(ch) { return moreRecords.value[ch] ?? null }
    function hasNoRecords(ch) { return noRecords.value[ch] ?? null }

    async function find({ channel: ch, type, id, params = {}, suppress = false }) {
      // Filter out null/undefined params (lodash 4 omit no longer accepts predicates)
      params = pickBy(params, v => v !== null && v !== undefined)
      error.value[ch] = null
      loading.value[ch] = true
      meta.value[ch] = meta.value[ch] || {}
      moreRecords.value[ch] = false
      noRecords.value[ch] = false
      try {
        const records = await apiClient.find(type, id, params)
        channels.value[ch] = records
        meta.value[ch] = records.meta || {}
        moreRecords.value[ch] = get(records, 'meta.record_count') > records.length
        noRecords.value[ch] = records.length === 0
      } catch (err) {
        const requestError = new RequestError(err, { suppress })
        error.value[ch] = requestError
        emitter.emit('didFindError', requestError)
      } finally {
        loading.value[ch] = false
      }
    }

    async function save({ record, params = {}, suppress = false, suppressSuccess = false, suppressError = false }) {
      const persisted = record._persisted
      try {
        const saved = await apiClient.save(record, { params })
        emitter.emit('didSaveRecord', { record: saved, suppress: suppress || suppressSuccess })
        emitter.emit(persisted ? 'didUpdateRecord' : 'didCreateRecord', { record: saved, suppress: suppress || suppressSuccess })
        const type = saved.type.split('_').map(part => part[0].toUpperCase() + part.slice(1)).join('')
        emitter.emit('didUpdate' + type, { record: saved })
      } catch (err) {
        emitter.emit('didSaveError', new RequestError(err, { record, suppress: suppress || suppressError }))
      }
    }

    async function deleteRecord({ record, suppress = false, suppressSuccess = false, suppressError = false }) {
      try {
        await apiClient.delete(record)
        emitter.emit('didDeleteRecord', { record, suppress: suppress || suppressSuccess })
        const type = record.type.split('_').map(part => part[0].toUpperCase() + part.slice(1)).join('')
        emitter.emit('didUpdate' + type, { record })
      } catch (err) {
        emitter.emit('didDeleteError', new RequestError(err, { record, suppress: suppress || suppressError }))
      }
    }

    function clear({ channel: ch }) {
      channels.value[ch] = null
      error.value[ch] = null
      loading.value[ch] = null
      meta.value[ch] = {}
      moreRecords.value[ch] = null
      noRecords.value[ch] = null
    }

    function materialize({ records, channel: ch }) {
      clear({ channel: ch })
      channels.value[ch] = coreStore.materializeRecords(records)
    }

    return {
      channels, error, loading, meta, moreRecords, noRecords,
      channel, getError, isLoading, getMeta, hasMoreRecords, hasNoRecords,
      find, save, deleteRecord, clear, materialize,
    }
  })
}
