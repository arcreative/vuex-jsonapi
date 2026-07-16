'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var isEqual = require('fast-deep-equal');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var isEqual__default = /*#__PURE__*/_interopDefaultLegacy(isEqual);

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
  save(record, options = {
    materialize: true
  }) {
    return this.http[record._persisted ? 'patch' : 'post']('/' + record.type + (record._persisted ? '/' + record.id : ''), this.store.serializeRecord(record), options).then(res => {
      this.store.persist(record, res.data.data.id);

      // Sometimes we don't want to materialize--for instance, if we're sending a preflight request and don't want to
      // persist changes to the store
      if (options.materialize) {
        return this.store.materializeRecords.call(this.store, res);
      } else {
        return {
          response: res,
          data: record,
          included: [],
          meta: (res.data || {}).meta
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

class EventBus {
  constructor() {
    this.handlers = {};
  }
  on(event, handler) {
    this.handlers[event] = this.handlers[event] || [];
    this.handlers[event].push(handler);
  }
  off(event, handler) {
    if (this.handlers[event]) {
      let index = this.handlers[event].indexOf(handler);
      if (index > -1) {
        this.handlers[event].splice(index, 1);
      }
    }
  }
  emit(event, context = {}) {
    if (this.handlers[event]) {
      for (let i = 0; i < this.handlers[event].length; i++) {
        this.handlers[event][i](context);
      }
    }
  }
  extendTo(store) {
    store.$on = this.on.bind(this);
    store.$off = this.off.bind(this);
    store.$emit = this.emit.bind(this);
  }
}

const objectProto$2 = Object.prototype;
const isPlainObject = value => value !== null && typeof value === 'object' && objectProto$2.toString.call(value) === '[object Object]';

const deepClone = (value, seen = new WeakMap()) => {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return seen.get(value);
    }
    const cloned = [];
    seen.set(value, cloned);
    value.forEach(item => {
      cloned.push(deepClone(item, seen));
    });
    return cloned;
  }
  if (isPlainObject(value)) {
    if (seen.has(value)) {
      return seen.get(value);
    }
    const cloned = {};
    seen.set(value, cloned);
    Object.keys(value).forEach(key => {
      cloned[key] = deepClone(value[key], seen);
    });
    return cloned;
  }
  return value;
};

// https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_difference
// Removed use of `includes` in favor of `indexOf` for Browser compatibility
var difference = (a, b) => {
  return [a, b].reduce(function (a, b) {
    return a.filter(function (value) {
      return b.indexOf(value) === -1;
    });
  });
};

const objectProto$1 = Object.prototype;
const isRecordReference = value => isPlainObject(value) && objectProto$1.hasOwnProperty.call(value, 'id') && objectProto$1.hasOwnProperty.call(value, 'type');

const objectProto = Object.prototype;
const isAttributeEqual = (a, b) => {
  // Compare record-like objects as identity references only.
  if (isRecordReference(a) || isRecordReference(b)) {
    return isRecordReference(a) && isRecordReference(b) && a.id === b.id && a.type === b.type;
  }
  if (a instanceof Array || b instanceof Array) {
    if (!(a instanceof Array) || !(b instanceof Array)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isAttributeEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    let aKeys = Object.keys(a);
    let bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (let i = 0; i < aKeys.length; i++) {
      let key = aKeys[i];
      if (!objectProto.hasOwnProperty.call(b, key)) return false;
      if (!isAttributeEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return isEqual__default["default"](a, b);
};

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
    this.type = data.type || this.type;
    this._data.attributes = deepClone(data.attributes || {});
    this._data.relationships = deepClone(data.relationships || {});
    this._data.meta = deepClone(data.meta || {});
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
    path.forEach(part => {
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
    let clone = Object.assign(new Record(this.type), this);
    let relationships = this._data.relationships || {};
    Object.keys(clone).forEach(key => {
      if (key === '_data') {
        clone._data = deepClone(this._data);
        return;
      }
      if (key.startsWith('_') || key === 'id' || key === 'type') return;

      // Keep relationship records by reference, but detach relationship arrays.
      if (relationships[key] !== undefined) {
        if (this[key] instanceof Array) {
          clone[key] = this[key].slice();
        }
        return;
      }
      clone[key] = deepClone(this[key]);
    });
    return clone;
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
      return attributes.some(attr => dirtyAttrs.indexOf(attr) !== -1);
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
    // _data and _persisted would be ignored below, but just being explicit because those attributes are universal
    let props = difference(Object.keys(this), ['id', 'type', '_data', '_persisted']);

    // Check each prop for changes
    return props.filter(prop => {
      let current = this[prop];
      let relationship = this._data.relationships[prop];

      // Skip attributes prepended with _
      if (prop.startsWith('_')) return false;
      if (relationship !== undefined) {
        const relationshipData = relationship.data;
        if (relationshipData instanceof Array) {
          if (!(current instanceof Array)) current = current || [];
          if (!(current instanceof Array)) return true;
          if (current.length !== relationshipData.length) return true;
          const currentKeys = current.map(value => `${value.type}:${value.id}`).sort();
          const relationshipKeys = relationshipData.map(value => `${value.type}:${value.id}`).sort();
          return !isAttributeEqual(currentKeys, relationshipKeys);
        }
        if (relationshipData instanceof Object) {
          return !isAttributeEqual(current, relationshipData);
        }

        // Not loaded: only dirty when a new value is set.
        return !!current;
      } else {
        // Scalar attribute (including objects/arrays)
        return !isAttributeEqual(current, this._data.attributes[prop]);
      }
    });
  }
}

// https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_extend
var extend = (target, ...sources) => {
  const length = sources.length;
  if (length < 1 || target == null) return target;
  for (let i = 0; i < length; i++) {
    const source = sources[i];
    for (const key in source) {
      target[key] = source[key];
    }
  }
  return target;
};

// This function uses duck typing to infer whether an object is a Record class or not since `instanceof` checks while
// using `yarn link` or `npm link` are unreliable/defunct.
var isRecord = item => {
  if (!item) return false;
  if (typeof item !== 'object') return false;
  if (!item.type) return false;
  if (typeof item.id === 'undefined') return false;
  return true;
};

class Store {
  /**
   * Store/cache for API records
   */
  constructor(Vue, models, {
    relationshipsForType = {}
  } = {}) {
    this.Vue = Vue;
    this.data = models;
    this.eventBus = new EventBus();
    this.relationshipsForType = relationshipsForType;
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
   * @returns {{data: Array, response: *, meta, included: Array}}
   */
  materializeRecords(data) {
    let response = data;

    // If HTTP response and included is found, materialize all included records first so they're available to the
    // main records
    let included = [];
    if (data && data.data && data.data.included) {
      included = this.materializeRecords(data.data.included).data;
    }

    // Capture the meta
    let meta = {};
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
    data.forEach(item => {
      let record = this.getRecord(item.type, item.id);
      record.materialize(item);
      this.hydrateRecord(record);
      ret.push(record);
    });

    // Transform back to response data format
    ret = single ? ret[0] : ret;

    // Send it on
    return {
      response,
      data: ret,
      included,
      meta
    };
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

    // Build relationship names from relationships data hash, as well as what's specified by configuration object
    const relationshipNames = Object.keys(record._data.relationships);
    (this.relationshipsForType[record.type] || []).forEach(name => {
      if (relationshipNames.indexOf(name) === -1) {
        relationshipNames.push(name);
      }
    });
    for (let key in record) {
      if (record.hasOwnProperty(key) && key.indexOf('_') !== 0 && ['id', 'type', 'meta'].indexOf(key) === -1) {
        const value = record[key],
          inferredRecord = isRecord(value),
          inferredRecordArray = value instanceof Array && isRecord(value[0]);

        // Check if key is either explicitly or implicitly identified as a relationship
        if (relationshipNames.indexOf(key) !== -1 || inferredRecord || inferredRecordArray) {
          // Is a relationship
          if (isRecord(value)) {
            body.relationships[key] = {
              data: {
                type: value.type,
                id: value.id
              }
            };
          } else if (value instanceof Array) {
            body.relationships[key] = {
              data: value.map(item => ({
                type: item.type,
                id: item.id
              }))
            };
          } else if (value === null || typeof value === 'undefined') {
            body.relationships[key] = {
              data: null
            };
          } else {
            throw new Error(`Error serializing a ${record.type}'s "${key}" attribute, as it was identified as a relationship but is not an Array or Record.`);
          }
        } else {
          // Is an attribute
          body.attributes[key] = value;
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
    extend(record, deepClone(record._data.attributes));
    Object.keys(record._data.relationships).forEach(name => {
      const data = record._data.relationships[name].data;
      if (!data) return;
      if (data instanceof Array) {
        this.Vue.set(record, name, data.map(item => {
          return this.getRecord(item.type, item.id);
        }));
      } else {
        this.Vue.set(record, name, this.getRecord(data.type, data.id));
      }
    });
  }

  /**
   * Registers an event handler for a particular event type
   *
   * @param event Event name
   * @param handler Event handler
   */
  $on(event, handler) {
    this.eventBus.on(event, handler);
  }

  /**
   * Deregisters an event handler for a particular event type
   *
   * @param event Event name
   * @param handler Event handler
   */
  $off(event, handler) {
    this.eventBus.off(event, handler);
  }

  /**
   * Emits an event
   *
   * @param event Event name
   * @param context Data/context to be passed with event
   */
  $emit(event, context) {
    this.eventBus.emit(event, context);
  }
}

var state = {
  models: {},
  channels: {},
  error: {},
  loading: {},
  meta: {},
  moreRecords: {},
  noRecords: {}
};

var getters = {
  itemsById(state) {
    return (type, ids) => {
      return ids.map(id => state.models[type][id]);
    };
  },
  channel(state) {
    return channel => {
      return state.channels[channel];
    };
  },
  error(state) {
    return channel => {
      return state.error[channel];
    };
  },
  loading(state) {
    return channel => {
      return state.loading[channel];
    };
  },
  meta(state) {
    return channel => {
      return state.meta[channel];
    };
  },
  moreRecords(state) {
    return channel => {
      return state.moreRecords[channel];
    };
  },
  noRecords(state) {
    return channel => {
      return state.noRecords[channel];
    };
  }
};

var mutations = {
  updateChannel(state, {
    channel,
    value
  }) {
    this._vm.$set(state.channels, channel, value);
  },
  updateError(state, {
    channel,
    value
  }) {
    this._vm.$set(state.error, channel, value);
  },
  updateLoading(state, {
    channel,
    value
  }) {
    this._vm.$set(state.loading, channel, value);
  },
  updateMeta(state, {
    channel,
    value
  }) {
    this._vm.$set(state.meta, channel, value);
  },
  updateMoreRecords(state, {
    channel,
    value
  }) {
    this._vm.$set(state.moreRecords, channel, value);
  },
  updateNoRecords(state, {
    channel,
    value
  }) {
    this._vm.$set(state.noRecords, channel, value);
  }
};

// https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_get
var get = (obj, path, defaultValue = undefined) => {
  const travel = regexp => String.prototype.split.call(path, regexp).filter(Boolean).reduce((res, key) => res !== null && res !== undefined ? res[key] : res, obj);
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
};

const UNKNOWN_ERROR = 'An error occurred with your request, please try again momentarily';
class RequestError extends Error {
  constructor(httpError, {
    record = null,
    customMessage = null
  } = {}) {
    super();
    Object.assign(this, {
      record,
      customMessage,
      httpError
    });
    this.message = customMessage || this._getMessageFromHttpError();
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
  _getMessageFromHttpError() {
    if (this.httpError && this.httpError.response && this.httpError.response.status) {
      switch (this.httpError.response.status) {
        case 400:
          return 'An error occurred with your request, please contact support with more information';
        case 401:
          return 'Please log in to continue';
        case 403:
          return 'You don\'t have permission to perform that action';
        case 404:
          return 'That record cannot be found';
        case 422:
          return 'Error saving record';
        default:
          return UNKNOWN_ERROR;
      }
    }
    return UNKNOWN_ERROR;
  }
}

var actionsFactory = (apiClient, store, eventBus) => {
  return {
    find({
      commit,
      state
    }, {
      channel,
      type,
      id,
      params,
      errorMessage = true,
      onSuccess = null,
      onError = null,
      clear = false
    } = {}) {
      // Drop any params that are null or undefined
      params = extend({}, params);
      for (let param in params) {
        if (params.hasOwnProperty(param) && params[param] === null || typeof params[param] === 'undefined') {
          delete params[param];
        }
      }
      if (clear) {
        commit('updateChannel', {
          channel,
          value: id ? null : []
        });
      }
      commit('updateError', {
        channel,
        value: null
      });
      commit('updateLoading', {
        channel,
        value: true
      });
      commit('updateMeta', {
        channel,
        value: get(state, 'meta.' + channel) || {}
      });
      commit('updateMoreRecords', {
        channel,
        value: false
      });
      commit('updateNoRecords', {
        channel,
        value: false
      });
      apiClient.find(type, id, params).then(({
        data,
        meta
      }) => {
        commit('updateChannel', {
          channel,
          value: data
        });
        commit('updateMeta', {
          channel,
          value: meta
        });
        commit('updateMoreRecords', {
          channel,
          value: meta.record_count > data.length
        });
        commit('updateNoRecords', {
          channel,
          value: data.length === 0
        });
        if (onSuccess) {
          onSuccess(data, meta);
        }
      }).catch(error => {
        const customMessage = typeof errorMessage === 'string' ? errorMessage : null,
          wrappedError = new RequestError(error, {
            customMessage
          }),
          returnContext = {
            error: wrappedError,
            errorMessage
          };
        commit('updateError', {
          channel,
          value: wrappedError
        });
        eventBus.emit('didFindError', returnContext);
        if (onError) {
          onError(returnContext);
        }
      }).finally(() => {
        commit('updateLoading', {
          channel,
          value: false
        });
      });
    },
    findSparse({
      commit,
      state,
      dispatch
    }, {
      channel,
      type,
      ids,
      params = {},
      errorMessage = true,
      loadUnpersisted = true,
      loadAll = false,
      filterParam = 'filter[id]',
      onSuccess = null,
      onError = null
    } = {}) {
      // Track unpersisted IDs for sparse loading later
      let unpersistedIds = [];

      // Grab/instantiate all items from/to the store
      let records = ids.map(id => {
        if (state.models[type] && state.models[type][id]) {
          return state.models[type][id];
        } else {
          unpersistedIds.push(id);
          return store.persist(new Record(type, {
            id
          }), id);
        }
      });

      // Load records if loadAll is set, or if loadUnpersisted is set and one or more records are unpersisted
      if (loadAll || loadUnpersisted && unpersistedIds.length > 0) {
        params[filterParam] = loadAll ? ids.join(',') : unpersistedIds.join(',');

        // Fire this into the void, it'll deserialize onto the old object...
        dispatch('find', {
          channel,
          type,
          params,
          onSuccess,
          onError
        });
      } else if (onSuccess) {
        onSuccess();
      }
      return records;
    },
    save({
      commit
    }, {
      record,
      params = {},
      materialize = true,
      successMessage = true,
      errorMessage = true,
      onSuccess = null,
      onError = null
    } = {}) {
      let persisted = record._persisted;
      apiClient.save(record, {
        params,
        materialize
      }).then(({
        data
      }) => {
        const record = data,
          returnContext = {
            record,
            successMessage
          };

        // Notify of save/create/update
        eventBus.emit('didSaveRecord', returnContext);
        eventBus.emit(persisted ? 'didUpdateRecord' : 'didCreateRecord', returnContext);

        // Notify that one or more records of this type changed
        let type = record.type.split('_').map(part => {
          return part[0].toUpperCase() + part.slice(1, part.length);
        }).join('');
        eventBus.emit('didUpdate' + type, {
          record
        });
        if (onSuccess) {
          onSuccess(returnContext);
        }
      }, error => {
        const customMessage = typeof errorMessage === 'string' ? errorMessage : null,
          wrappedError = new RequestError(error, {
            record,
            customMessage
          }),
          returnContext = {
            record,
            error: wrappedError,
            errorMessage
          };
        eventBus.emit('didSaveError', returnContext);
        if (onError) {
          onError(returnContext);
        }
      });
    },
    delete({
      commit
    }, {
      record,
      successMessage = true,
      errorMessage = true,
      onSuccess = null,
      onError = null
    } = {}) {
      apiClient.delete(record).then(() => {
        // Notify of save/create/update
        eventBus.emit('didDeleteRecord', {
          record,
          successMessage
        });

        // Notify that one or more records of this type changed
        let type = record.type.split('_').map(part => {
          return part[0].toUpperCase() + part.slice(1, part.length);
        }).join('');
        eventBus.emit('didUpdate' + type, {
          record
        });
        if (onSuccess) {
          onSuccess({
            record
          });
        }
      }, error => {
        const customMessage = typeof errorMessage === 'string' ? errorMessage : null,
          wrappedError = new RequestError(error, {
            record,
            customMessage
          }),
          returnContext = {
            error: wrappedError,
            errorMessage
          };
        eventBus.emit('didDeleteError', returnContext);
        if (onError) {
          onError({
            record
          });
        }
      });
    },
    clear({
      commit,
      state
    }, {
      channel,
      collection = true
    } = {}) {
      commit('updateChannel', {
        channel,
        value: collection ? [] : null
      });
      commit('updateError', {
        channel,
        value: null
      });
      commit('updateLoading', {
        channel,
        value: false
      });
      commit('updateMeta', {
        channel,
        value: {}
      });
      commit('updateMoreRecords', {
        channel,
        value: false
      });
      commit('updateNoRecords', {
        channel,
        value: false
      });
    },
    materialize({
      dispatch,
      commit
    }, {
      records,
      channel
    }) {
      dispatch('clear', {
        channel
      });
      commit('updateChannel', {
        channel,
        value: store.materializeRecords(records).data
      });
    }
  };
};

var mapChannel = (channel, name = null, {
  dynamic = false
} = {}) => {
  return {
    [name ? name : 'model']() {
      return this.$store.getters.channel(dynamic ? this[channel] : channel);
    },
    [name ? name + 'Error' : 'error']() {
      return this.$store.getters.error(dynamic ? this[channel] : channel);
    },
    [name ? name + 'Loading' : 'loading']() {
      return this.$store.getters.loading(dynamic ? this[channel] : channel);
    },
    [name ? name + 'Meta' : 'meta']() {
      return this.$store.getters.meta(dynamic ? this[channel] : channel);
    },
    [name ? name + 'MoreRecords' : 'moreRecords']() {
      return this.$store.getters.moreRecords(dynamic ? this[channel] : channel);
    },
    [name ? name + 'NoRecords' : 'noRecords']() {
      return this.$store.getters.noRecords(dynamic ? this[channel] : channel);
    }
  };
};

var index_esm = {
  Client,
  Record,
  Store,
  install(Vue, axiosClient, vuexStore, {
    storeEvents = true,
    relationshipsForType = {}
  } = {}) {
    // Instantiate internal store/client/event bus
    let store = new Store(Vue, state.models, {
      relationshipsForType
    });
    let apiClient = new Client(store, axiosClient);
    let eventBus = new EventBus();

    // Register module with Vuex
    vuexStore.registerModule('vuexJsonapi', {
      state,
      getters,
      mutations,
      actions: actionsFactory(apiClient, store, eventBus)
    });

    // Extend $on/$off/$emit to Vuex Store
    if (storeEvents) {
      eventBus.extendTo(vuexStore);
    }

    // Return instantiated helpers
    return {
      apiClient,
      eventBus
    };
  }
};

exports.Client = Client;
exports.Record = Record;
exports.RequestError = RequestError;
exports.Store = Store;
exports["default"] = index_esm;
exports.isRecord = isRecord;
exports.mapChannel = mapChannel;
