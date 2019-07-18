export default {
  updateChannel(state, { channel, value }) {
    this._vm.$set(state.channels, channel, value);
  },
  updateError(state, { channel, value }) {
    this._vm.$set(state.error, channel, value);
  },
  updateLoading(state, { channel, value }) {
    this._vm.$set(state.loading, channel, value);
  },
  updateMeta(state, { channel, value }) {
    this._vm.$set(state.meta, channel, value);
  },
  updateMoreRecords(state, { channel, value }) {
    this._vm.$set(state.moreRecords, channel, value);
  },
  updateNoRecords(state, { channel, value }) {
    this._vm.$set(state.noRecords, channel, value);
  },
};
