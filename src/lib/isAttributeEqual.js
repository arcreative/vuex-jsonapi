import isEqual from 'fast-deep-equal'

import isPlainObject from './isPlainObject'
import isRecordReference from './isRecordReference'

const objectProto = Object.prototype;

const isAttributeEqual = (a, b) => {
  // Compare record-like objects as identity references only.
  if (isRecordReference(a) || isRecordReference(b)) {
    return isRecordReference(a) &&
           isRecordReference(b) &&
           a.id === b.id &&
           a.type === b.type;
  }

  if (a instanceof Array || b instanceof Array) {
    if (!(a instanceof Array) || !(b instanceof Array)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isAttributeEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    let aKeys = Object.keys(a);
    let bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;

    for (let i = 0; i < aKeys.length; i++) {
      let key = aKeys[i];
      if (!objectProto.hasOwnProperty.call(b, key)) return false;
      if (!isAttributeEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return isEqual(a, b);
}

export default isAttributeEqual;
