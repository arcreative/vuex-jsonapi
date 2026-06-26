'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var extend = _interopDefault(require('lodash-es/extend'));
var difference = _interopDefault(require('lodash-es/difference'));
var filter = _interopDefault(require('lodash-es/filter'));
var forEach = _interopDefault(require('lodash-es/forEach'));
var isEqual = _interopDefault(require('lodash-es/isEqual'));
var some = _interopDefault(require('lodash-es/some'));
var vue = require('vue');
var pinia = require('pinia');
var get = _interopDefault(require('lodash-es/get'));
var pickBy = _interopDefault(require('lodash-es/pickBy'));

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
  request(method, url, {
    data,
    params
  }) {
    return this.http({
      method: method.toLowerCase(),
      url,
      data,
      params
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
    return this.http.get('/' + type + (id ? '/' + id : ''), {
      params
    }).then(this.store.materializeRecords.bind(this.store));
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
  save(record, options = {}) {
    return this.http[record.id ? 'patch' : 'post']('/' + record.type + (record.id ? '/' + record.id : ''), this.store.serializeRecord(record), options).then(res => {
      this.store.persist(record, res.data.data.id);
      return this.store.materializeRecords.call(this.store, res);
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

class Record {
  /**
   * Record
   *
   * @param type
   * @param data
   * @returns {Record.Record}
   */
  constructor(type, data = {}) {
    this.type = type;
    this._persisted = false;
    this._data = {
      attributes: {},
      relationships: {},
      meta: {}
    };
    Object.assign(this, data);
  }

  /**
   * Persists and materializes record from HTTP response body
   *
   * @param data
   * @returns {Record}
   */
  materialize(data = {
    id: null,
    type: null,
    attributes: {},
    relationships: {},
    meta: {}
  }) {
    this._persisted = true;
    this.id = data.id || this.id;
    this.type = data.type || this.id;
    this._data.attributes = extend(this._data.attributes, data.attributes);
    this._data.relationships = extend(this._data.relationships, data.relationships);
    this._data.meta = extend(this._data.meta, data.meta);
    return this;
  }

  /**
   * Gets an attribute without throwing a traversal error
   *
   * @param path
   */
  get(path) {
    path = path.split('.');
    let val = this;
    forEach(path, part => {
      if (val && val[part]) {
        val = val[part];
      } else {
        val = null;
      }
    });
    return val;
  }

  /**
   * Creates an editable clone that will deserialize into the same record
   *
   * @returns {Record}
   */
  clone() {
    return Object.assign(new Record(this.type), this);
  }

  /**
   * Checks if record, attribute, or set of attributes is dirty
   * Note: this does not currently support hasMany relationships
   *
   * @param attributes {null|String|String[]}
   */
  dirty(attributes = null) {
    if (!this._persisted) return true;
    let dirtyAttrs = this.dirtyAttributes();
    if (attributes === null && dirtyAttrs.length) {
      return true;
    } else if (attributes instanceof Array) {
      return some(attributes, attr => dirtyAttrs.indexOf(attr) !== -1);
    } else {
      return dirtyAttrs.indexOf(attributes) !== -1;
    }
  }

  /**
   * Returns all dirty attributes
   *
   * @returns {Array}
   */
  dirtyAttributes() {
    let props = difference(Object.keys(this), ['id', 'type', '_data', '_persisted']);
    return filter(props, prop => {
      let current = this[prop];
      let relationship = this._data.relationships[prop];
      if (relationship !== undefined) {
        // Relationship
        if (relationship.data instanceof Array) {
          // Has many
          current = current || [];

          // Different number of elements is automatic fail
          if (current.length !== relationship.data.length) return true;

          // Map the items to sortable identifiers
          let a = current.map(item => `${item.type}:${item.id}`);
          let b = relationship.data.map(item => `${item.type}:${item.id}`);

          // Compare
          return !isEqual(a.sort(), b.sort());
        } else if (relationship.data instanceof Object) {
          // Belongs to
          if (!!current !== !!relationship.data || current.id !== relationship.data.id || current.type !== relationship.data.type) {
            return true;
          }
        } else {
          // Not loaded
          if (current) {
            // But new value is set
            return true;
          }
        }
        return false;
      } else {
        // Attribute
        return current !== this._data.attributes[prop];
      }
    });
  }
}

class Store {
  /**
   * Store/cache for API records
   */
  constructor(state) {
    this.data = state;
  }

  /**
   * Gets a record, instantiating in store if needed
   *
   * @param type
   * @param id
   * @returns {Record}
   */
  getRecord(type, id) {
    this.data[type] = this.data[type] || {};
    this.data[type][id] = this.data[type][id] || new Record(type);
    this.data[type][id].id = id;
    return this.data[type][id];
  }

  /**
   * Set a new record on the store for subsequent retrieval
   *
   * @param record
   * @param id
   * @returns {Record}
   */
  persist(record, id) {
    this.data[record.type] = this.data[record.type] || {};
    this.data[record.type][id] = record;
    return record;
  }

  /**
   * Materializes and returns records from an HTTP response body
   *
   * @param data
   * @returns {Record|Record[]}
   */
  materializeRecords(data) {
    // If HTTP response and included is found, materialize all included records first so they're available to the
    // main records
    if (data && data.data && data.data.included) {
      this.materializeRecords(data.data.included);
    }

    // Capture the meta
    let meta = null;
    if (data && data.data && data.data.meta) {
      meta = data.data.meta;
    }

    // If HTTP response, set data to response's data element
    if (data && data.data && data.data.data) {
      data = data.data.data;
    }

    // Coerce response into array for iteration
    let single = false;
    let ret = [];
    if (!(data instanceof Array)) {
      single = true;
      data = [data];
    }

    // Persist, materialize, hydrate
    forEach(data, item => {
      let record = this.getRecord(item.type, item.id);
      record.materialize(item);
      this.hydrateRecord(record);
      ret.push(record);
    });

    // Transform back to response data format
    ret = single ? ret[0] : ret;

    // Append the meta (if applicable)
    if (meta) {
      ret.meta = meta;
    }

    // Send it on
    return ret;
  }

  /**
   * Serializes record into server-friendly body
   *
   * @param record
   * @returns Object
   */
  serializeRecord(record) {
    let body = {
      id: record.id,
      type: record.type,
      attributes: {},
      relationships: {}
    };
    for (var key in record) {
      if (record.hasOwnProperty(key) && key.indexOf('_') !== 0 && ['id', 'type', 'meta'].indexOf(key) === -1) {
        var prop = record[key];
        if (prop instanceof Record) {
          body.relationships[key] = {
            data: {
              type: prop.type,
              id: prop.id
            }
          };
        } else if (prop instanceof Array && prop[0] instanceof Record) {
          body.relationships[key] = prop.map(item => {
            return {
              data: {
                type: item.type,
                id: item.id
              }
            };
          });
        } else if (Object.keys(record._data.relationships).indexOf(key) !== -1 && prop === null) {
          body.relationships[key] = {
            data: null
          };
        } else {
          body.attributes[key] = prop;
        }
      }
    }
    return {
      data: body
    };
  }

  /**
   * Hydrates top level with attributes and available relationships from store
   *
   * @param record
   */
  hydrateRecord(record) {
    extend(record, record._data.attributes);
    forEach(record._data.relationships, (item, name) => {
      let data = item.data;
      if (!data) return;
      if (data instanceof Array) {
        record[name] = data.map(item => this.getRecord(item.type, item.id));
      } else {
        record[name] = this.getRecord(data.type, data.id);
      }
    });
  }
}

const UNKNOWN_ERROR = 'An error occurred with your request, please try again momentarily';
class RequestError extends Error {
  constructor(httpError, {
    record,
    suppress = false
  }) {
    super();
    this.httpError = httpError;
    this._setMessageFromHttpError();
    Object.assign(this, {
      record,
      suppress
    });
  }
  request() {
    return get(this, 'httpError.request');
  }
  response() {
    return get(this, 'httpError.response');
  }
  record() {
    return this.record;
  }
  errors() {
    return get(this, 'httpError.response.data.errors') || [];
  }
  attributeErrors() {
    let ret = {};
    this.errors().map(error => {
      if (error && error.code === '100') {
        ret[error.source.pointer.split('/').pop()] = error.title;
      }
    });
    return ret;
  }
  _setMessageFromHttpError() {
    if (this.httpError && this.httpError.response && this.httpError.response.status) {
      switch (this.httpError.response.status) {
        case 400:
          return this.message = 'An error occurred with your request, please contact support with more information';
        case 403:
          return this.message = 'You don\'t have permission to perform that action';
        case 404:
          return this.message = 'That record cannot be found';
        case 422:
          return this.message = 'Error saving record';
        default:
          return this.message = UNKNOWN_ERROR;
      }
    }
    return this.message = UNKNOWN_ERROR;
  }
}

function defineJsonapiStore(id, apiClient, coreStore, emitter) {
  return pinia.defineStore(id, () => {
    const channels = vue.ref({});
    const error = vue.ref({});
    const loading = vue.ref({});
    const meta = vue.ref({});
    const moreRecords = vue.ref({});
    const noRecords = vue.ref({});
    function channel(ch) {
      var _channels$value$ch;
      return (_channels$value$ch = channels.value[ch]) !== null && _channels$value$ch !== void 0 ? _channels$value$ch : null;
    }
    function getError(ch) {
      var _error$value$ch;
      return (_error$value$ch = error.value[ch]) !== null && _error$value$ch !== void 0 ? _error$value$ch : null;
    }
    function isLoading(ch) {
      var _loading$value$ch;
      return (_loading$value$ch = loading.value[ch]) !== null && _loading$value$ch !== void 0 ? _loading$value$ch : null;
    }
    function getMeta(ch) {
      var _meta$value$ch;
      return (_meta$value$ch = meta.value[ch]) !== null && _meta$value$ch !== void 0 ? _meta$value$ch : null;
    }
    function hasMoreRecords(ch) {
      var _moreRecords$value$ch;
      return (_moreRecords$value$ch = moreRecords.value[ch]) !== null && _moreRecords$value$ch !== void 0 ? _moreRecords$value$ch : null;
    }
    function hasNoRecords(ch) {
      var _noRecords$value$ch;
      return (_noRecords$value$ch = noRecords.value[ch]) !== null && _noRecords$value$ch !== void 0 ? _noRecords$value$ch : null;
    }
    async function find({
      channel: ch,
      type,
      id,
      params = {},
      suppress = false
    }) {
      // Filter out null/undefined params (lodash 4 omit no longer accepts predicates)
      params = pickBy(params, v => v !== null && v !== undefined);
      error.value[ch] = null;
      loading.value[ch] = true;
      meta.value[ch] = meta.value[ch] || {};
      moreRecords.value[ch] = false;
      noRecords.value[ch] = false;
      try {
        const records = await apiClient.find(type, id, params);
        channels.value[ch] = records;
        meta.value[ch] = records.meta || {};
        moreRecords.value[ch] = get(records, 'meta.record_count') > records.length;
        noRecords.value[ch] = records.length === 0;
      } catch (err) {
        const requestError = new RequestError(err, {
          suppress
        });
        error.value[ch] = requestError;
        emitter.emit('didFindError', requestError);
      } finally {
        loading.value[ch] = false;
      }
    }
    async function save({
      record,
      params = {},
      suppress = false,
      suppressSuccess = false,
      suppressError = false
    }) {
      const persisted = record._persisted;
      try {
        const saved = await apiClient.save(record, {
          params
        });
        emitter.emit('didSaveRecord', {
          record: saved,
          suppress: suppress || suppressSuccess
        });
        emitter.emit(persisted ? 'didUpdateRecord' : 'didCreateRecord', {
          record: saved,
          suppress: suppress || suppressSuccess
        });
        const type = saved.type.split('_').map(part => part[0].toUpperCase() + part.slice(1)).join('');
        emitter.emit('didUpdate' + type, {
          record: saved
        });
      } catch (err) {
        emitter.emit('didSaveError', new RequestError(err, {
          record,
          suppress: suppress || suppressError
        }));
      }
    }
    async function deleteRecord({
      record,
      suppress = false,
      suppressSuccess = false,
      suppressError = false
    }) {
      try {
        await apiClient.delete(record);
        emitter.emit('didDeleteRecord', {
          record,
          suppress: suppress || suppressSuccess
        });
        const type = record.type.split('_').map(part => part[0].toUpperCase() + part.slice(1)).join('');
        emitter.emit('didUpdate' + type, {
          record
        });
      } catch (err) {
        emitter.emit('didDeleteError', new RequestError(err, {
          record,
          suppress: suppress || suppressError
        }));
      }
    }
    function clear({
      channel: ch
    }) {
      channels.value[ch] = null;
      error.value[ch] = null;
      loading.value[ch] = null;
      meta.value[ch] = {};
      moreRecords.value[ch] = null;
      noRecords.value[ch] = null;
    }
    function materialize({
      records,
      channel: ch
    }) {
      clear({
        channel: ch
      });
      channels.value[ch] = coreStore.materializeRecords(records);
    }
    return {
      channels,
      error,
      loading,
      meta,
      moreRecords,
      noRecords,
      channel,
      getError,
      isLoading,
      getMeta,
      hasMoreRecords,
      hasNoRecords,
      find,
      save,
      deleteRecord,
      clear,
      materialize
    };
  });
}

class EventEmitter {
  constructor() {
    this._listeners = {};
  }
  on(event, fn) {
    this._listeners[event] = this._listeners[event] || [];
    this._listeners[event].push(fn);
    return this;
  }
  off(event, fn) {
    if (!this._listeners[event]) return this;
    this._listeners[event] = this._listeners[event].filter(l => l !== fn);
    return this;
  }
  emit(event, payload) {
    (this._listeners[event] || []).forEach(fn => fn(payload));
    return this;
  }
}

function useChannel(store, ch, name = null) {
  return {
    [name !== null && name !== void 0 ? name : 'model']: () => store.channel(ch),
    [name ? name + 'Error' : 'error']: () => store.getError(ch),
    [name ? name + 'Loading' : 'loading']: () => store.isLoading(ch),
    [name ? name + 'Meta' : 'meta']: () => store.getMeta(ch),
    [name ? name + 'MoreRecords' : 'moreRecords']: () => store.hasMoreRecords(ch),
    [name ? name + 'NoRecords' : 'noRecords']: () => store.hasNoRecords(ch)
  };
}

function createPiniaJsonapi(axiosClient, options = {}) {
  const models = {};
  const coreStore = new Store(models);
  const apiClient = new Client(coreStore, axiosClient);
  const emitter = new EventEmitter();
  const useJsonapiStore = defineJsonapiStore(options.storeId || 'jsonapi', apiClient, coreStore, emitter);
  return {
    useJsonapiStore,
    apiClient,
    emitter
  };
}
var pinia_esm = {
  version: '0.1.0',
  Client,
  Record,
  Store,
  createPiniaJsonapi
};

exports.Client = Client;
exports.EventEmitter = EventEmitter;
exports.Record = Record;
exports.RequestError = RequestError;
exports.Store = Store;
exports.createPiniaJsonapi = createPiniaJsonapi;
exports.default = pinia_esm;
exports.useChannel = useChannel;
