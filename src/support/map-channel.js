export default (channel) => {
  return {
    model () { return this.$store.getters.channel(channel) },
    loading() { return this.$store.getters.loading(channel) },
    error() { return this.$store.getters.error(channel) },
  }
};
