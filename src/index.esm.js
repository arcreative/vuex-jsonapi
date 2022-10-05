import Client from './core/client'
import EventBus from './core/event-bus'
import Record from './core/record'
import Store from './core/store'

import state from './extensions/state'
import getters from './extensions/getters'
import mutations from './extensions/mutations'
import actionsFactory from './extensions/actions-factory'

import isRecord from './support/is-record'
import mapChannel from './support/map-channel'
import RequestError from './support/request-error'

export default {
  version: '__VERSION__',
  Client,
  Record,
  Store,

  install(Vue, axiosClient, vuexStore, {
    storeEvents = true,
    relationshipsForType = {},
  } = {}) {

    // Instantiate internal store/client/event bus
    let store = new Store(Vue, state.models, { relationshipsForType });
    let apiClient = new Client(store, axiosClient);
    let eventBus = new EventBus();

    // Register module with Vuex
    vuexStore.registerModule('vuexJsonapi', {
      state,
      getters,
      mutations,
      actions: actionsFactory(apiClient, store, eventBus),
    });

    // Extend $on/$off/$emit to Vuex Store
    if (storeEvents) {
      eventBus.extendTo(vuexStore);
    }

    // Return instantiated helpers
    return {
      apiClient,
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
  isRecord,
  mapChannel,
  RequestError,
};
