import isPlainObject from './isPlainObject'

const deepClone = value => {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (value instanceof Array) {
    return value.map(item => deepClone(item));
  }

  if (isPlainObject(value)) {
    const cloned = {};
    Object.keys(value).forEach(key => {
      cloned[key] = deepClone(value[key]);
    });
    return cloned;
  }

  return value;
};

export default deepClone;
