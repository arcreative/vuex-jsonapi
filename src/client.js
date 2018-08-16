class Client {
  /**
   * Client
   *
   * @param store
   * @param http
   */
  constructor(store, http) {
    this.store = store;
    this.http = http;
  }

  /**
   * Performs a request to an API endpoint and returns the response object
   *
   * @param method
   * @param url
   * @returns {PromiseLike<*>}
   */
  request(method, url, data) {
    return this.http({
      method: method.toLowerCase(),
      url,
      data,
    });
  }

  /**
   * Performs a request to an API endpoint and materializes and returns the resultant records
   *
   * @param method
   * @param url
   * @returns {PromiseLike<Record|Record[]>}
   */
  requestRecords(method, url) {
    return this.request(method, url).then(this.store.materializeRecords.bind(this.store));
  }

  /**
   * Wrapped get request
   *
   * @param type
   * @param id
   * @param options
   * @returns {PromiseLike<*>}
   */
  get(type, id, params) {
    return this.http
        .get('/' + type + (id ? '/' + id : ''), { params })
        .then(this.store.materializeRecords.bind(this.store));
  }

  /**
   * Finds one or more records
   *
   * @param type
   * @param id
   * @param options
   * @returns {PromiseLike<Record|Record[]>}
   */
  find(type, id, options = {}) {
    if (id instanceof Object) {
      options = id;
      id = null;
    }
    return new Promise((resolve, reject) => {
      if (id) {
        let record = this.store.getRecord(type, id);
        if (record.persisted) {
          return resolve(record);
        }
      }
      this.get(type, id, options).then(resolve).catch(reject);
    });

  }
}

export default Client;
