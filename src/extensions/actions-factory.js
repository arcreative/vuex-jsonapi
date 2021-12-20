import extend from '../lib/extend'
import get from '../lib/get'

import Record from '../core/record'
import RequestError from '../support/request-error'

export default (apiClient, store, eventBus) => {
  return {
    find({ commit, state }, {
      channel,
      type,
      id,
      params,
      errorMessage = true,
      onSuccess = null,
      onError = null,
    } = {}) {

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
          if (onSuccess) { onSuccess(data) }
        })
        .catch(error => {
          const customMessage = typeof errorMessage === 'string' ? errorMessage : null,
                wrappedError = new RequestError(error, { customMessage }),
                returnContext = { error: wrappedError, errorMessage };
          commit('updateError', { channel, value: wrappedError });
          eventBus.emit('didFindError', returnContext);
          if (onError) { onError(returnContext) }
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
      onSuccess = null,
      onError = null,
    } = {}) {

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
        dispatch('find', { channel, type, params, onSuccess, onError });
      } else if (onSuccess) {
        onSuccess();
      }

      return records;
    },
    save({ commit }, {
      record,
      params = {},
      materialize = true,
      successMessage = true,
      errorMessage = true,
      onSuccess = null,
      onError = null,
    } = {}) {
      let persisted = record._persisted;
      apiClient
        .save(record, { params, materialize })
        .then(({ data }) => {
          const record = data,
                returnContext = { record, successMessage };

          // Notify of save/create/update
          eventBus.emit('didSaveRecord', returnContext);
          eventBus.emit(persisted ? 'didUpdateRecord' : 'didCreateRecord', returnContext);

          // Notify that one or more records of this type changed
          let type = record.type.split('_').map(part => {
            return part[0].toUpperCase() + part.slice(1, part.length);
          }).join('');
          eventBus.emit('didUpdate' + type, { record });
          if (onSuccess) { onSuccess(returnContext) }
        }, error => {
          const customMessage = typeof errorMessage === 'string' ? errorMessage : null,
                wrappedError = new RequestError(error, { record, customMessage }),
                returnContext = { record, error: wrappedError, errorMessage };
          eventBus.emit('didSaveError', returnContext);
          if (onError) { onError(returnContext) }
        });
    },
    delete({ commit }, {
      record,
      successMessage = true,
      errorMessage = true,
      onSuccess = null,
      onError = null,
    } = {}) {
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

          if (onSuccess) { onSuccess({ record }) }
        }, error => {
          const customMessage = typeof errorMessage === 'string' ? errorMessage : null,
                wrappedError = new RequestError(error, { record, customMessage }),
                returnContext = { error: wrappedError, errorMessage };
          eventBus.emit('didDeleteError', returnContext);
          if (onError) { onError({ record }) }
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
