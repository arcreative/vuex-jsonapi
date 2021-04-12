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
   * @param options
   * @returns {Promise<*>}
   */
  request(method, url, { data, params }) {
    return this.http({
      method: method.toLowerCase(),
      url,
      data,
      params,
    });
  }

  /**
   * Performs a request to an API endpoint and materializes and returns the resultant records
   *
   * @param method
   * @param url
   * @param options
   * @returns {Promise<Record|Record[]>}
   */
  requestRecords(method, url, options = {}) {
    return this.request(method, url, options).then(this.store.materializeRecords.bind(this.store));
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

  /**
   * Wrapped post/put/patch request
   *
   * @param record
   * @param options
   * @returns {Promise<*>}
   */
  save(record, options = { materialize: true }) {
    return this
      .http[record._persisted ? 'patch' : 'post'](
        '/' + record.type + (record._persisted ? '/' + record.id : ''),
        this.store.serializeRecord(record),
        options,
      )
      .then(res => {
        this.store.persist(record, res.data.data.id);

        // Sometimes we don't want to materialize--for instance, if we're sending a preflight request and don't want to
        // persist changes to the store
        if (options.materialize) {
          return this.store.materializeRecords.call(this.store, res)
        } else {
          return {
            response: res,
            data: record,
            included: [],
            meta: (res.data || {}).meta,
          };
        }
      });
  }

  /**
   * Wrapped delete request
   *
   * @param record
   * @returns {Promise<*>}
   */
  delete(record) {
    return this.http.delete('/' + record.type + '/' + record.id);
  }
}

export default Client;
