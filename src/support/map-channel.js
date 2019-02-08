export default (channel, name = null) => {
  return {
    [name ? name : 'model']() { return this.$store.getters.channel(channel) },
    [name ? name + 'Loading' : 'loading']() { return this.$store.getters.loading(channel) },
    [name ? name + 'Error' : 'error']() { return this.$store.getters.error(channel) },
  };
};
