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
   * @param data
   * @returns {Promise<*>}
   */
  request(method, url, data = null) {
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
   * @returns {Promise<Record|Record[]>}
   */
  requestRecords(method, url) {
    return this.request(method, url).then(this.store.materializeRecords.bind(this.store));
  }

  /**
   * Wrapped get request
   *
   * @param type
   * @param id
   * @param params
   * @returns {Promise<*>}
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
   * @returns {Promise<Record|Record[]>}
   */
  find(type, id, options = {}) {
    if (id instanceof Object) {
      options = id;
      id = null;
    }
    return this.get(type, id, options);
  }
}

export default Client;
