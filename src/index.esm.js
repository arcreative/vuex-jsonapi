import { cloneDeep } from 'lodash-es'

import Client from './core/client'
import Record from './core/record'
import Store from './core/store'

import mapChannel from './support/map-channel'
import parseRequestError from './support/parse-request-error'

import actions from './extensions/actions'
import getters from './extensions/getters'
import mutations from './extensions/mutations'
import state from './extensions/state'

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

    // Hello, world!
    console.info('VueJsonapi installed.');

    return {
      apiClient,
      state: stateClone,
      mutations,
      actions: actions(apiClient),
      getters
    }
  }
};

export {
  Client,
  Record,
  Store,
  parseRequestError,
  mapChannel
}
