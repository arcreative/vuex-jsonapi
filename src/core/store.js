import { extend, forEach } from 'lodash-es'

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
   * Hydrates top level with attributes and available relationships from store
   *
   * @param record
   */
  hydrateRecord(record) {
    extend(record, record.data.attributes);
    forEach(record.data.relationships, (item, name) => {
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

export default Store;
