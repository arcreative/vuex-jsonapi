import deepClone from '../lib/deepClone'
import difference from '../lib/difference'
import isAttributeEqual from '../lib/isAttributeEqual'

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
      meta: {},
    };
    Object.assign(this, data);
  }

  /**
   * Persists and materializes record from HTTP response body
   *
   * @param data
   * @returns {Record}
   */
  materialize(data = { id: null, type: null, attributes: {}, relationships: {}, meta: {} }) {
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
    clone._data = deepClone(this._data);
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
      return attributes.some(attr => (dirtyAttrs.indexOf(attr) !== -1))
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

export default Record;
