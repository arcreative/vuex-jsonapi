import get from 'lodash-es/get'
import omit from 'lodash-es/omit'

import RequestError from '../support/request-error'

export default (apiClient, store, eventBus) => {
  return {
    find({ commit, state }, { channel, type, id, params, errorMessage = true }) {
      params = omit(params, (param) => {
        return param === null || param === undefined;
      });
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
    save({ commit }, { record, params = {}, successMessage = true, errorMessage = true }) {
      let persisted = record._persisted;
      apiClient
        .save(record, { params })
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
          eventBus.emit('didSaveError', { error: wrappedError, errorMessage });
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
      commit('updateLoading', { channel, value: null });
      commit('updateMeta', { channel, value: {} });
      commit('updateMoreRecords', { channel, value: null });
      commit('updateNoRecords', { channel, value: null });
    },
    materialize({ dispatch, commit }, { records, channel }) {
      dispatch('clear', { channel });
      commit('updateChannel', { channel, value: store.materializeRecords(records).data });
    }
  };
}
