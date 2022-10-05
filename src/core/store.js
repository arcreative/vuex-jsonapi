import extend from '../lib/extend'

import Record from './record'
import EventBus from './event-bus'
import isRecord from '../support/is-record'

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

    // Build relationship names from relationships data hash, as well as what's specified by configuration object
    const relationshipNames = Object.keys(record._data.relationships);
    (this.relationshipsForType[record.type] || []).forEach((name) => {
      if (relationshipNames.indexOf(name) === -1) {
        relationshipNames.push(name);
      }
    });

    for (let key in record) {
      if (record.hasOwnProperty(key) && key.indexOf('_') !== 0 && ['id', 'type', 'meta'].indexOf(key) === -1) {
        const value = record[key],
              inferredRecord = (isRecord(value)),
              inferredRecordArray = (value instanceof Array && isRecord(value[0]));

        // Check if key is either explicitly or implicitly identified as a relationship
        if (relationshipNames.indexOf(key) !== -1 || inferredRecord || inferredRecordArray) {
          // Is a relationship
          if (isRecord(value)) {
            body.relationships[key] = { data: { type: value.type, id: value.id } };
          } else if (value instanceof Array) {
            body.relationships[key] = {
              data: value.map(item => ({ type: item.type, id: item.id })),
            };
          } else if (value === null || typeof value === 'undefined') {
            body.relationships[key] = { data: null }
          } else {
            throw new Error(`Error serializing a ${record.type}'s "${key}" attribute, as it was identified as a relationship but is not an Array or Record.`);
          }
        } else {
          // Is an attribute
          body.attributes[key] = value;
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
