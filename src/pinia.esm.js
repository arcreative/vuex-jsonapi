import Client from './core/client'
import Record from './core/record'
import Store from './core/store'
import { defineJsonapiStore } from './extensions/pinia-store'
import EventEmitter from './support/event-emitter'
import useChannel from './support/use-channel'
import RequestError from './support/request-error'

function createPiniaJsonapi(axiosClient, options = {}) {
  const models = {};
  const coreStore = new Store(models);
  const apiClient = new Client(coreStore, axiosClient);
  const emitter = new EventEmitter();
  const useJsonapiStore = defineJsonapiStore(options.storeId || 'jsonapi', apiClient, coreStore, emitter);

  return { useJsonapiStore, apiClient, emitter };
}

export default {
  version: '__VERSION__',
  Client,
  Record,
  Store,
  createPiniaJsonapi,
};

export {
  Client,
  Record,
  Store,
  EventEmitter,
  createPiniaJsonapi,
  useChannel,
  RequestError,
};
