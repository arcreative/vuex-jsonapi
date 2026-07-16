import isPlainObject from './isPlainObject'

const deepClone = (value, seen = new WeakMap()) => {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return seen.get(value);
    }

    const cloned = [];
    seen.set(value, cloned);
    value.forEach(item => {
      cloned.push(deepClone(item, seen));
    });
    return cloned;
  }

  if (isPlainObject(value)) {
    if (seen.has(value)) {
      return seen.get(value);
    }

    const cloned = {};
    seen.set(value, cloned);
    Object.keys(value).forEach(key => {
      cloned[key] = deepClone(value[key], seen);
    });
    return cloned;
  }

  return value;
};

export default deepClone;
