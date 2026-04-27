import isPlainObject from './isPlainObject'

const objectProto = Object.prototype;

const isRecordReference = value => (
  isPlainObject(value) &&
  objectProto.hasOwnProperty.call(value, 'id') &&
  objectProto.hasOwnProperty.call(value, 'type')
);

export default isRecordReference;
