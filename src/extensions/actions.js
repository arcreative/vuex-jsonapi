import parseRequestError from "../support/parse-request-error";
import { omit } from 'lodash-es'

export default (apiClient) => {
  return {
    find({ commit }, { channel, type, id, params }) {
      params = omit(params, (param) => {
        return param === null || param === undefined;
      });
      commit('updateLoading', { channel, value: true });
      commit('updateError', { channel, value: null });
      apiClient
        .find(type, id, params)
        .then(records => {
          commit('updateChannel', { channel, records });
        })
        .catch((e) => {
          let context = parseRequestError(e);
          commit('updateError', { channel, value: context });

          // TODO: abstract this
          this.dispatch('updateSnackbar', context.message);
        })
        .finally(() => {
          commit('updateLoading', { channel, value: false });
        })
    }
  };
}
