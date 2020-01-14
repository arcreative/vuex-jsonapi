import cloneDeep from 'lodash-es/cloneDeep'

import Client from './core/client'
import EventBus from './core/event-bus'
import Record from './core/record'
import Store from './core/store'

import actions from './extensions/actions'
import getters from './extensions/getters'
import mutations from './extensions/mutations'
import state from './extensions/state'

import mapChannel from './support/map-channel'
import RequestError from './support/request-error'

export default {
  version: '__VERSION__',
  Client,
  Record,
  Store,

  install (Vue, axiosClient, options = {}) {

    // Extend state from default
    let stateClone = cloneDeep(state);
    let store = new Store(Vue, state.models);
    let apiClient = new Client(store, axiosClient);
    let eventBus = new EventBus();

    return {
      apiClient,
      state: stateClone,
      mutations,
      actions: actions(apiClient, store, eventBus),
      getters,
      eventBus,
    }
  }
};

export {
  // Core
  Client,
  Record,
  Store,

  // Support
  mapChannel,
  RequestError,
}
