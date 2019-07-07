import extend from 'lodash-es/extend'
import forEach from 'lodash-es/forEach'

import Record from './record'

class Store {
  /**
   * Store/cache for API records
   */
  constructor(Vue, state) {
    this.Vue = Vue;
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
    // If HTTP response, set data to response's data element
    if (data && data.data && data.data.data) {
      data = data.data.data;
    }
    let single = false;
    let ret = [];
    if (!(data instanceof Array)) {
      single = true;
      data = [data];
    }
    forEach(data, item => {
      let record = this.getRecord(item.type, item.id);
      record.materialize(item);
      this.hydrateRecord(record);
      ret.push(record);
    });
    return single ? ret[0] : ret;
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
      relationships: {},
    };

    for (var key in record) {
      if (record.hasOwnProperty(key) && key.indexOf('_') !== 0 && ['id', 'type'].indexOf(key) === -1) {
        var prop = record[key];
        if (prop instanceof Record) {
          body.relationships[key] = { data: { type: prop.type, id: prop.id } };
        } else if (prop instanceof Array && prop[0] instanceof Record) { // TODO: make this better--needs relationship awareness
          body.relationships[key] = prop.map((item) => {
            return {data: {type: item.type, id: item.id}}
          });
        } else if (Object.keys(record._data.relationships).indexOf(key) !== -1 && prop === null) {
          body.relationships[key] = { data: null };
        } else {
          body.attributes[key] = prop;
        }
      }
    }

    return { data: body };
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
      if (!data) {
        this.Vue.set(record, name, null);
      } else if (data.length) {
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

export default Store;
