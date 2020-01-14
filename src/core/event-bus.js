class EventBus {
  constructor() {
    this.handlers = {};
  }

  on(event, handler) {
    this.handlers[event] = this.handlers[event] || [];
    this.handlers[event].push(handler);
  }

  off(event, handler) {
    if (this.handlers[event]) {
      let index = this.handlers[event].indexOf(handler);
      if (index > -1) {
        this.handlers[event].splice(index, 1);
      }
    }
  }

  emit(event, context = {}) {
    if (this.handlers[event]) {
      for (let i = 0; i < this.handlers[event].length; i++) {
        this.handlers[event][i](context);
      }
    }
  }

  extendTo(store) {
    store.$on = this.on.bind(this);
    store.$off = this.off.bind(this);
    store.$emit = this.emit.bind(this);
  }
}

export default EventBus;
