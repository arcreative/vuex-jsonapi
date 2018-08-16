import extend from 'lodash-es/extend'

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
      meta: {},
    };
  }

  /**
   * Persists and materializes record from HTTP response body
   *
   * @param data
   * @returns {Record}
   */
  materialize(data = { id, type, attributes: {}, relationships: {}, meta: {} }) {
    this.persisted = true;
    this.id = data.id;
    this.type = data.type;
    this.data.attributes = extend(this.data.attributes, data.attributes);
    this.data.relationships = extend(this.data.relationships, data.relationships);
    this.data.meta = extend(this.data.meta, data.meta);
    return this;
  }
}

export default Record;
