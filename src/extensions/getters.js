export default {
  channel(state) {
    return channel => {
      return state.channels[channel];
    };
  },
  error(state) {
    return channel => {
      return state.error[channel];
    };
  },
  loading(state) {
    return channel => {
      return state.loading[channel];
    };
  },
  meta(state) {
    return channel => {
      return state.meta[channel];
    };
  },
  moreRecords(state) {
    return channel => {
      return state.moreRecords[channel];
    };
  },
  noRecords(state) {
    return channel => {
      return state.noRecords[channel];
    };
  },
}
