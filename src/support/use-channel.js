export default function useChannel(store, ch, name = null) {
  return {
    [name ?? 'model']: () => store.channel(ch),
    [name ? name + 'Error' : 'error']: () => store.getError(ch),
    [name ? name + 'Loading' : 'loading']: () => store.isLoading(ch),
    [name ? name + 'Meta' : 'meta']: () => store.getMeta(ch),
    [name ? name + 'MoreRecords' : 'moreRecords']: () => store.hasMoreRecords(ch),
    [name ? name + 'NoRecords' : 'noRecords']: () => store.hasNoRecords(ch),
  };
}
