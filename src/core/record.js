import difference from '../lib/difference'
import extend from '../lib/extend'
import isEqual from '../lib/isEqual'

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
        // Relationship
        if (relationship.data instanceof Array) {
          // Has many
          current = current || [];

          // Different number of elements is automatic fail
          if (current.length !== relationship.data.length) return true;

          // Map the items to sortable identifiers
          let a = current.map(item => (`${item.type}:${item.id}`));
          let b = relationship.data.map(item => (`${item.type}:${item.id}`));

          // Compare
          return !isEqual(a.sort(), b.sort());
        } else if (relationship.data instanceof Object) {
          // Belongs to
          if (
            !!current !== !!relationship.data ||
            current.id !== relationship.data.id ||
            current.type !== relationship.data.type
          ) {
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

export default Record;
