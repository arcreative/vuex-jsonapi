import extend from '../lib/extend'

import Record from './record'
import EventBus from './event-bus'

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
      meta,
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
      relationships: {},
    };

    const relationshipNames = Object.keys(record._data.relationships);
    for (let key in record) {
      if (record.hasOwnProperty(key) && key.indexOf('_') !== 0 && ['id', 'type', 'meta'].indexOf(key) === -1) {
        const prop = record[key];
        if (prop instanceof Record) {
          body.relationships[key] = { data: { type: prop.type, id: prop.id } };
        } else if (prop instanceof Array && prop[0] instanceof Record) {
          body.relationships[key] = {
            data: prop.map(item => ({ type: item.type, id: item.id }))
          };
        } else {
          if (relationshipNames.indexOf(key) !== -1 && prop === null) {
            body.relationships[key] = { data: null };
          } else {
            body.attributes[key] = prop;
          }
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

export default Store;
