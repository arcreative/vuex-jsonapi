import cloneDeep from 'lodash-es/cloneDeep';
import extend from 'lodash-es/extend';
import difference from 'lodash-es/difference';
import filter from 'lodash-es/filter';
import forEach from 'lodash-es/forEach';
import isEqual from 'lodash-es/isEqual';
import some from 'lodash-es/some';
import get from 'lodash-es/get';
import omit from 'lodash-es/omit';

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

var actions = (apiClient, store) => {
  return {
    find({
      commit,
      state
    }, {
      channel,
      type,
      id,
      params,
      suppress = false
    }) {
      params = omit(params, param => {
        return param === null || param === undefined;
      });
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
      apiClient.find(type, id, params).then(records => {
        commit('updateChannel', {
          channel,
          value: records
        });
        commit('updateMeta', {
          channel,
          value: records.meta || {}
        });
        commit('updateMoreRecords', {
          channel,
          value: get(records, 'meta.record_count') > records.length
        });
        commit('updateNoRecords', {
          channel,
          value: records.length === 0
        });
      }).catch(error => {
        let requestError = new RequestError(error, {
          suppress
        });
        commit('updateError', {
          channel,
          value: requestError
        });
        this._vm.$emit('didFindError', requestError);
      }).finally(() => {
        commit('updateLoading', {
          channel,
          value: false
        });
      });
    },
    save({
      commit
    }, {
      record,
      params = {},
      suppress = false,
      suppressSuccess = false,
      suppressError = false
    }) {
      let persisted = record._persisted;
      apiClient.save(record, {
        params
      }).then(record => {
        // Notify of save/create/update
        this._vm.$emit('didSaveRecord', {
          record,
          suppress: suppress || suppressSuccess
        });
        this._vm.$emit(persisted ? 'didUpdateRecord' : 'didCreateRecord', {
          record,
          suppress: suppress || suppressSuccess
        });

        // Notify that one or more records of this type changed
        let type = record.type.split('_').map(part => {
          return part[0].toUpperCase() + part.slice(1, part.length);
        }).join('');
        this._vm.$emit('didUpdate' + type, {
          record
        });
      }, error => {
        this._vm.$emit('didSaveError', new RequestError(error, {
          record,
          suppress: suppress || suppressError
        }));
      });
    },
    delete({
      commit
    }, {
      record,
      suppress = false,
      suppressSuccess = false,
      suppressError = false
    }) {
      apiClient.delete(record).then(() => {
        // Notify of save/create/update
        this._vm.$emit('didDeleteRecord', {
          record,
          suppress: suppress || suppressSuccess
        });

        // Notify that one or more records of this type changed
        let type = record.type.split('_').map(part => {
          return part[0].toUpperCase() + part.slice(1, part.length);
        }).join('');
        this._vm.$emit('didUpdate' + type, {
          record
        });
      }, error => {
        this._vm.$emit('didDeleteError', new RequestError(error, {
          record,
          suppress: suppress || suppressError
        }));
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
        value: null
      });
      commit('updateMeta', {
        channel,
        value: {}
      });
      commit('updateMoreRecords', {
        channel,
        value: null
      });
      commit('updateNoRecords', {
        channel,
        value: null
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
        value: store.materializeRecords(records)
      });
    }
  };
};

var getters = {
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

var state = {
  models: {},
  channels: {},
  error: {},
  loading: {},
  meta: {},
  moreRecords: {},
  noRecords: {}
};

var mapChannel = (channel, name = null) => {
  return {
    [name ? name : 'model']() {
      return this.$store.getters.channel(channel);
    },
    [name ? name + 'Error' : 'error']() {
      return this.$store.getters.error(channel);
    },
    [name ? name + 'Loading' : 'loading']() {
      return this.$store.getters.loading(channel);
    },
    [name ? name + 'Meta' : 'meta']() {
      return this.$store.getters.meta(channel);
    },
    [name ? name + 'MoreRecords' : 'moreRecords']() {
      return this.$store.getters.moreRecords(channel);
    },
    [name ? name + 'NoRecords' : 'noRecords']() {
      return this.$store.getters.noRecords(channel);
    }
  };
};

var index_esm = {
  version: '0.1.0',
  Client,
  Record,
  Store,
  install(Vue, axiosClient, options = {}) {
    // Extend state from default
    let stateClone = cloneDeep(state);
    let store = new Store(state.models);
    let apiClient = new Client(store, axiosClient);
    return {
      apiClient,
      state: stateClone,
      mutations,
      actions: actions(apiClient, store),
      getters
    };
  }
};

export default index_esm;
export { Client, Record, RequestError, Store, mapChannel };
