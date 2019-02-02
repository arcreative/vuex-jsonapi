import Client from './client'
import Record from './record'
import Store from './store'

export default {
  version: '__VERSION__',
  Client,
  Record,
  Store,
  createClient: (Vue, state, httpClient) => {
    let store = new Store(Vue, state);
    return new Client(store, httpClient)
  }
};

export {
  Client,
  Record,
  Store,
}
