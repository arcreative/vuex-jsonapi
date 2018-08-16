import Client from './client'
import Record from './record'
import Store from './store'

export default {
  version: '__VERSION__',
  Client,
  Record,
  Store,
  createClient: (httpClient) => {
    let store = new Store()
    return new Client(store, httpClient)
  }
};

export {
  Client,
  Record,
  Store,
}
