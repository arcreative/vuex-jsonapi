export default {
  updateChannel(state, { channel, records }) {
    this._vm.$set(state.channels, channel, records);
  },
  updateError(state, { channel, value }) {
    this._vm.$set(state.error, channel, value);
  },
  updateLoading(state, { channel, value }) {
    this._vm.$set(state.loading, channel, value);
  },
  updateNoRecords(state, { channel, value }) {
    this._vm.$set(state.noRecords, channel, value);
  },
};
