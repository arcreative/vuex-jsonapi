import extend from '../lib/extend'
import get from '../lib/get'

import Record from '../core/record'
import RequestError from '../support/request-error'

export default (apiClient, store, eventBus) => {
  return {
    find({ commit, state }, { channel, type, id, params, errorMessage = true }) {

      // Drop any params that are null or undefined
      params = extend({}, params);
      for (let param in params) {
        if (params.hasOwnProperty(param) && params[param] === null || typeof params[param] === 'undefined') {
          delete params[param];
        }
      }

      commit('updateError', { channel, value: null });
      commit('updateLoading', { channel, value: true });
      commit('updateMeta', { channel, value: get(state, 'meta.' + channel) || {} });
      commit('updateMoreRecords', { channel, value: false });
      commit('updateNoRecords', { channel, value: false });
      apiClient
        .find(type, id, params)
        .then(({ data, meta }) => {
          commit('updateChannel', { channel, value: data });
          commit('updateMeta', { channel, value: meta });
          commit('updateMoreRecords', { channel, value: meta.record_count > data.length });
          commit('updateNoRecords', { channel, value: data.length === 0 });
        })
        .catch(error => {
          let customMessage = typeof errorMessage === 'string' ? errorMessage : null;
          let wrappedError = new RequestError(error, { customMessage });
          commit('updateError', { channel, value: wrappedError });
          eventBus.emit('didFindError', { error: wrappedError, errorMessage });
        })
        .finally(() => {
          commit('updateLoading', { channel, value: false });
        })
    },
    findSparse({ commit, state, dispatch }, {
      channel,
      type,
      ids,
      params = {},
      errorMessage = true,
      loadUnpersisted = true,
      loadAll = false,
      filterParam = 'filter[id]',
    }) {

      // Track unpersisted IDs for sparse loading later
      let unpersistedIds = [];

      // Grab/instantiate all items from/to the store
      let records = ids.map(id => {
        if (state.models[type] && state.models[type][id]) {
          return state.models[type][id];
        } else {
          unpersistedIds.push(id);
          return store.persist(new Record(type, { id }), id);
        }
      });

      // Load records if loadAll is set, or if loadUnpersisted is set and one or more records are unpersisted
      if (loadAll || loadUnpersisted && unpersistedIds.length > 0) {
        params[filterParam] = loadAll ? ids.join(',') :unpersistedIds.join(',');

        // Fire this into the void, it'll deserialize onto the old object...
        dispatch('find', { channel, type, params: params })
      }

      return records;
    },
    save({ commit }, { record, params = {}, materialize = true, successMessage = true, errorMessage = true }) {
      let persisted = record._persisted;
      apiClient
        .save(record, { params, materialize })
        .then(({ data }) => {
          let record = data;

          // Notify of save/create/update
          eventBus.emit('didSaveRecord', { record, successMessage });
          eventBus.emit(persisted ? 'didUpdateRecord' : 'didCreateRecord', { record, successMessage });

          // Notify that one or more records of this type changed
          let type = record.type.split('_').map(part => {
            return part[0].toUpperCase() + part.slice(1, part.length);
          }).join('');
          eventBus.emit('didUpdate' + type, { record });
        }, error => {
          let customMessage = typeof errorMessage === 'string' ? errorMessage : null;
          let wrappedError = new RequestError(error, { record, customMessage });
          eventBus.emit('didSaveError', { record, error: wrappedError, errorMessage });
        });
    },
    delete({ commit }, { record, successMessage = true, errorMessage = true }) {
      apiClient
        .delete(record)
        .then(() => {
          // Notify of save/create/update
          eventBus.emit('didDeleteRecord', { record, successMessage });

          // Notify that one or more records of this type changed
          let type = record.type.split('_').map(part => {
            return part[0].toUpperCase() + part.slice(1, part.length);
          }).join('');
          eventBus.emit('didUpdate' + type, { record });
        }, error => {
          let customMessage = typeof errorMessage === 'string' ? errorMessage : null;
          let wrappedError = new RequestError(error, { record, customMessage });
          eventBus.emit('didDeleteError', { error: wrappedError, errorMessage });
        });
    },
    clear({ commit, state }, { channel }) {
      commit('updateChannel', { channel, value: null });
      commit('updateError', { channel, value: null });
      commit('updateLoading', { channel, value: false });
      commit('updateMeta', { channel, value: {} });
      commit('updateMoreRecords', { channel, value: false });
      commit('updateNoRecords', { channel, value: false });
    },
    materialize({ dispatch, commit }, { records, channel }) {
      dispatch('clear', { channel });
      commit('updateChannel', { channel, value: store.materializeRecords(records).data });
    }
  };
}
