(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('lodash-es')) :
  typeof define === 'function' && define.amd ? define(['exports', 'lodash-es'], factory) :
  (global = global || self, factory(global.VuexJsonapi = {}, global.lodashEs));
}(this, function (exports, lodashEs) { 'use strict';

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
        data
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

  }

  class Record {
    /**
     * Record
     *
     * @param type
     */
    constructor(type) {
      this.type = type;
      this.persisted = false;
      this.data = {
        attributes: {},
        relationships: {},
        meta: {}
      };
    }
    /**
     * Persists and materializes record from HTTP response body
     *
     * @param data
     * @returns {Record}
     */


    materialize(data = {
      id,
      type,
      attributes: {},
      relationships: {},
      meta: {}
    }) {
      this.persisted = true;
      this.id = data.id;
      this.type = data.type;
      this.data.attributes = lodashEs.extend(this.data.attributes, data.attributes);
      this.data.relationships = lodashEs.extend(this.data.relationships, data.relationships);
      this.data.meta = lodashEs.extend(this.data.meta, data.meta);
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
      lodashEs.forEach(path, part => {
        if (val && val[part]) {
          val = val[part];
        } else {
          val = null;
        }
      });
      return val;
    }

  }

  class Store {
    /**
     * Store/cache for API records
     */
    constructor(Vue, state) {
      this.Vue = Vue;
      this.data = state;
    }
    /**
     * Returns a new record of `type`
     *
     * @param type
     * @param id
     * @returns {Record}
     */


    createRecord(type, id = null) {
      let record = new Record(type);
      record.id = id;
      return record;
    }
    /**
     * Gets a record, setting an unpersisted record in the store if needed
     *
     * @param type
     * @param id
     * @returns {Record}
     */


    getRecord(type, id) {
      this.data[type] = this.data[type] || {};
      this.data[type][id] = this.data[type][id] || this.createRecord(type, id);
      return this.data[type][id];
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
      } // If HTTP response, set data to response's data element


      if (data && data.data && data.data.data) {
        data = data.data.data;
      }

      let single = false;
      let ret = [];

      if (!(data instanceof Array)) {
        single = true;
        data = [data];
      }

      lodashEs.forEach(data, item => {
        let record = this.getRecord(item.type, item.id);
        record.materialize(item);
        this.hydrateRecord(record);
        ret.push(record);
      });
      return single ? ret[0] : ret;
    }
    /**
     * Hydrates top level with attributes and available relationships from store
     *
     * @param record
     */


    hydrateRecord(record) {
      lodashEs.extend(record, record.data.attributes);
      lodashEs.forEach(record.data.relationships, (item, name) => {
        let data = item.data;
        if (!data) return;

        if (data.length) {
          this.Vue.set(record, name, data.map(item => {
            return this.getRecord(item.type, item.id);
          }));
        } else {
          if (!data.type || !data.id) return;
          this.Vue.set(record, name, this.getRecord(data.type, data.id));
        }
      });
    }

  }

  var mapChannel = ((channel, name = null) => {
    return {
      [name ? name : 'model']() {
        return this.$store.getters.channel(channel);
      },

      [name ? name + 'Loading' : 'loading']() {
        return this.$store.getters.loading(channel);
      },

      [name ? name + 'Error' : 'error']() {
        return this.$store.getters.error(channel);
      }

    };
  });

  const DEFAULT_ERROR = 'An error occurred with your request, support has been notified';
  var parseRequestError = (e => {
    let context = {
      error: e,
      message: null
    };

    if (e && e.response && e.response.status) {
      switch (e.response.status) {
        case 400:
          context.message = DEFAULT_ERROR;
          break;

        default:
          context.message = DEFAULT_ERROR;
      }
    } else {
      context.message = DEFAULT_ERROR;
    }

    return context;
  });

  var actions = (apiClient => {
    return {
      find({
        commit
      }, {
        channel,
        type,
        id,
        params
      }) {
        params = lodashEs.omit(params, param => {
          return param === null || param === undefined;
        });
        commit('updateLoading', {
          channel,
          value: true
        });
        commit('updateError', {
          channel,
          value: null
        });
        apiClient.find(type, id, params).then(records => {
          commit('updateChannel', {
            channel,
            records
          });
        }).catch(e => {
          let context = parseRequestError(e);
          commit('updateError', {
            channel,
            value: context
          }); // TODO: abstract this

          this.dispatch('updateSnackbar', context.message);
        }).finally(() => {
          commit('updateLoading', {
            channel,
            value: false
          });
        });
      }

    };
  });

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
    }

  };

  var mutations = {
    updateChannel(state, {
      channel,
      records
    }) {
      this._vm.$set(state.channels, channel, records);
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
    }

  };

  var state = {
    models: {},
    channels: {},
    loading: {},
    error: {}
  };

  var index_esm = {
    version: '0.1.0',
    Client,
    Record,
    Store,

    install(Vue, axiosClient, options = {}) {
      // Extend state from default
      let stateClone = lodashEs.cloneDeep(state);
      let store = new Store(Vue, state.models);
      let apiClient = new Client(store, axiosClient); // Hello, world!

      console.info('VuexJsonapi installed.');
      return {
        apiClient,
        state: stateClone,
        mutations,
        actions: actions(apiClient),
        getters
      };
    }

  };

  exports.default = index_esm;
  exports.Client = Client;
  exports.Record = Record;
  exports.Store = Store;
  exports.parseRequestError = parseRequestError;
  exports.mapChannel = mapChannel;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
