'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

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
      this.store.persist(record, res.data.data.id); // Sometimes we don't want to materialize--for instance, if we're sending a preflight request and don't want to
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

// https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_difference
// Removed use of `includes` in favor of `indexOf` for Browser compatibility
var difference = ((a, b) => {
  return [a, b].reduce(function (a, b) {
    return a.filter(function (value) {
      return b.indexOf(value) === -1;
    });
  });
});

// https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_extend
var extend = ((target, ...sources) => {
  const length = sources.length;
  if (length < 1 || target == null) return target;

  for (let i = 0; i < length; i++) {
    const source = sources[i];

    for (const key in source) {
      target[key] = source[key];
    }
  }

  return target;
});

// From https://stackoverflow.com/questions/3115982/how-to-check-if-two-arrays-are-equal-with-javascript#answer-10316616
// Option 3 (more efficient than other options)
const isEqual = (a, b) => {
  /*
      Array-aware equality checker:
      Returns whether arguments a and b are == to each other;
      however if they are equal-lengthed arrays, returns whether their
      elements are pairwise == to each other recursively under this
      definition.
  */
  if (a instanceof Array && b instanceof Array) {
    // assert same length
    if (a.length !== b.length) return false; // assert each element equal

    for (let i = 0; i < a.length; i++) if (!isEqual(a[i], b[i])) return false;

    return true;
  } else {
    return a === b; // if not both arrays, should be the same
  }
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
    let props = difference(Object.keys(this), ['id', 'type', '_data', '_persisted']);
    return props.filter(prop => {
      let current = this[prop];
      let relationship = this._data.relationships[prop];

      if (relationship !== undefined) {
        // Relationship
        if (relationship.data instanceof Array) {
          // Has many
          current = current || []; // Different number of elements is automatic fail

          if (current.length !== relationship.data.length) return true; // Map the items to sortable identifiers

          let a = current.map(item => `${item.type}:${item.id}`);
          let b = relationship.data.map(item => `${item.type}:${item.id}`); // Compare

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
  constructor(Vue, models) {
    this.Vue = Vue;
    this.data = models;
    this.eventBus = new EventBus();
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
    let response = data; // If HTTP response and included is found, materialize all included records first so they're available to the
    // main records

    let included = [];

    if (data && data.data && data.data.included) {
      included = this.materializeRecords(data.data.included).data;
    } // Capture the meta


    let meta = {};

    if (data && data.data && data.data.meta) {
      meta = data.data.meta;
    } // If HTTP response, set data to response's data element


    if (data && data.data && data.data.data) {
      data = data.data.data;
    } // Coerce response into array for iteration


    let single = false;
    let ret = [];

    if (!(data instanceof Array)) {
      single = true;
      data = [data];
    } // Persist, materialize, hydrate


    data.forEach(item => {
      let record = this.getRecord(item.type, item.id);
      record.materialize(item);
      this.hydrateRecord(record);
      ret.push(record);
    }); // Transform back to response data format

    ret = single ? ret[0] : ret; // Send it on

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
    const relationshipNames = Object.keys(record._data.relationships);

    for (let key in record) {
      if (record.hasOwnProperty(key) && key.indexOf('_') !== 0 && ['id', 'type', 'meta'].indexOf(key) === -1) {
        const prop = record[key];

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
        } else {
          if (relationshipNames.indexOf(key) !== -1 && prop === null) {
            body.relationships[key] = {
              data: null
            };
          } else {
            body.attributes[key] = prop;
          }
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
var get = ((obj, path, defaultValue = undefined) => {
  const travel = regexp => String.prototype.split.call(path, regexp).filter(Boolean).reduce((res, key) => res !== null && res !== undefined ? res[key] : res, obj);

  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
});

const UNKNOWN_ERROR = 'An error occurred with your request, please try again momentarily';
class RequestError extends Error {
  constructor(httpError, {
    record,
    customMessage = null
  }) {
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

var actionsFactory = ((apiClient, store, eventBus) => {
  return {
    find({
      commit,
      state
    }, {
      channel,
      type,
      id,
      params,
      errorMessage = true
    }) {
      // Drop any params that are null or undefined
      params = extend({}, params);

      for (let param in params) {
        if (params.hasOwnProperty(param) && params[param] === null || typeof params[param] === 'undefined') {
          delete params[param];
        }
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
      }).catch(error => {
        let customMessage = typeof errorMessage === 'string' ? errorMessage : null;
        let wrappedError = new RequestError(error, {
          customMessage
        });
        commit('updateError', {
          channel,
          value: wrappedError
        });
        eventBus.emit('didFindError', {
          error: wrappedError,
          errorMessage
        });
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
      filterParam = 'filter[id]'
    }) {
      // Track unpersisted IDs for sparse loading later
      let unpersistedIds = []; // Grab/instantiate all items from/to the store

      let records = ids.map(id => {
        if (state.models[type] && state.models[type][id]) {
          return state.models[type][id];
        } else {
          unpersistedIds.push(id);
          return store.persist(new Record(type, {
            id
          }), id);
        }
      }); // Load records if loadAll is set, or if loadUnpersisted is set and one or more records are unpersisted

      if (loadAll || loadUnpersisted && unpersistedIds.length > 0) {
        params[filterParam] = loadAll ? ids.join(',') : unpersistedIds.join(','); // Fire this into the void, it'll deserialize onto the old object...

        dispatch('find', {
          channel,
          type,
          params: params
        });
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
      errorMessage = true
    }) {
      let persisted = record._persisted;
      apiClient.save(record, {
        params,
        materialize
      }).then(({
        data
      }) => {
        let record = data; // Notify of save/create/update

        eventBus.emit('didSaveRecord', {
          record,
          successMessage
        });
        eventBus.emit(persisted ? 'didUpdateRecord' : 'didCreateRecord', {
          record,
          successMessage
        }); // Notify that one or more records of this type changed

        let type = record.type.split('_').map(part => {
          return part[0].toUpperCase() + part.slice(1, part.length);
        }).join('');
        eventBus.emit('didUpdate' + type, {
          record
        });
      }, error => {
        let customMessage = typeof errorMessage === 'string' ? errorMessage : null;
        let wrappedError = new RequestError(error, {
          record,
          customMessage
        });
        eventBus.emit('didSaveError', {
          record,
          error: wrappedError,
          errorMessage
        });
      });
    },

    delete({
      commit
    }, {
      record,
      successMessage = true,
      errorMessage = true
    }) {
      apiClient.delete(record).then(() => {
        // Notify of save/create/update
        eventBus.emit('didDeleteRecord', {
          record,
          successMessage
        }); // Notify that one or more records of this type changed

        let type = record.type.split('_').map(part => {
          return part[0].toUpperCase() + part.slice(1, part.length);
        }).join('');
        eventBus.emit('didUpdate' + type, {
          record
        });
      }, error => {
        let customMessage = typeof errorMessage === 'string' ? errorMessage : null;
        let wrappedError = new RequestError(error, {
          record,
          customMessage
        });
        eventBus.emit('didDeleteError', {
          error: wrappedError,
          errorMessage
        });
      });
    },

    clear({
      commit,
      state
    }, {
      channel
    }) {
      commit('updateChannel', {
        channel,
        value: null
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
});

var mapChannel = ((channel, name = null, {
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
});

var index_esm = {
  version: '0.8.1',
  Client,
  Record,
  Store,

  install(Vue, axiosClient, vuexStore, options = {
    storeEvents: true
  }) {
    // Instantiate internal store/client/event bus
    let store = new Store(Vue, state.models);
    let apiClient = new Client(store, axiosClient);
    let eventBus = new EventBus(); // Register module with Vuex

    vuexStore.registerModule('vuexJsonapi', {
      state,
      getters,
      mutations,
      actions: actionsFactory(apiClient, store, eventBus)
    }); // Extend $on/$off/$emit to Vuex Store

    if (options.storeEvents) {
      eventBus.extendTo(vuexStore);
    } // Return instantiated helpers


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
exports.default = index_esm;
exports.mapChannel = mapChannel;
