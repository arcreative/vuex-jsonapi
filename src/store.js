import forEach from 'lodash-es/forEach'

import Record from './record'

class Store {
  /**
   * Store/cache for API records
   */
  constructor() {
    this.data = {};
  }

  /**
   * Returns a new record of `type`
   *
   * @param type
   * @returns {Record}
   */
  createRecord(type) {
    return new Record(type);
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
      ret.push(record);
    });
    return single ? ret[0] : ret;
  }
}

export default Store;
