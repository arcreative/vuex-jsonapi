export default (channel, name = null) => {
  return {
    [name ? name : 'model']() { return this.$store.getters.channel(channel) },
    [name ? name + 'Error' : 'error']() { return this.$store.getters.error(channel) },
    [name ? name + 'Loading' : 'loading']() { return this.$store.getters.loading(channel) },
    [name ? name + 'Meta' : 'meta']() { return this.$store.getters.meta(channel) },
    [name ? name + 'MoreRecords' : 'moreRecords']() { return this.$store.getters.moreRecords(channel) },
    [name ? name + 'NoRecords' : 'noRecords']() { return this.$store.getters.noRecords(channel) },
  };
};
