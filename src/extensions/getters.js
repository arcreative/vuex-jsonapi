export default {
  channel (state) {
    return channel => {
      return state.channels[channel];
    };
  },
  error (state) {
    return channel => {
      return state.error[channel];
    };
  },
  errors (state) {
    return channel => {
      return state.errors[channel];
    };
  },
  loading (state) {
    return channel => {
      return state.loading[channel];
    };
  },
  noRecords (state) {
    return channel => {
      return state.noRecords[channel];
    };
  },
}
