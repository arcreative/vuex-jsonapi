class EventEmitter {
  constructor() {
    this._listeners = {};
  }

  on(event, fn) {
    this._listeners[event] = this._listeners[event] || [];
    this._listeners[event].push(fn);
    return this;
  }

  off(event, fn) {
    if (!this._listeners[event]) return this;
    this._listeners[event] = this._listeners[event].filter(l => l !== fn);
    return this;
  }

  emit(event, payload) {
    (this._listeners[event] || []).forEach(fn => fn(payload));
    return this;
  }
}

export default EventEmitter;
