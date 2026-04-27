const objectProto = Object.prototype;

const isPlainObject = value => (
  value !== null &&
  typeof value === 'object' &&
  objectProto.toString.call(value) === '[object Object]'
);

export default isPlainObject;
