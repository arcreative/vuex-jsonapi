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
  loading (state) {
    return channel => {
      return state.loading[channel];
    };
  },
}
