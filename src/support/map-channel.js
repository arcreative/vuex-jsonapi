export default (channel, name = null, { dynamic = false } = {}) => {
  return {
    [name ? name : 'model']() {
      return this.$store.getters.channel(dynamic ? this[channel] : channel)
    },
    [name ? name + 'Error' : 'error']() {
      return this.$store.getters.error(dynamic ? this[channel] : channel)
    },
    [name ? name + 'Loading' : 'loading']() {
      return this.$store.getters.loading(dynamic ? this[channel] : channel)
    },
    [name ? name + 'Meta' : 'meta']() {
      return this.$store.getters.meta(dynamic ? this[channel] : channel)
    },
    [name ? name + 'MoreRecords' : 'moreRecords']() {
      return this.$store.getters.moreRecords(dynamic ? this[channel] : channel)
    },
    [name ? name + 'NoRecords' : 'noRecords']() {
      return this.$store.getters.noRecords(dynamic ? this[channel] : channel)
    },
  };
};
