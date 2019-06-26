import get from 'lodash-es/get'

const UNKNOWN_ERROR = 'An error occurred with your request, please try again momentarily';

export default class RequestError extends Error {

  constructor(httpError, { record, suppress = false }) {
    super();
    this.httpError = httpError;
    this._setMessageFromHttpError();
    Object.assign(this, { record, suppress });
  }

  request() {
    return get(this, 'httpError.request');
  }

  response() {
    return get(this, 'httpError.response');
  }

  record() {
    return this.record;
  }

  errors() {
    return get(this, 'httpError.response.data.errors') || [];
  }

  _setMessageFromHttpError() {
    if (this.httpError && this.httpError.response && this.httpError.response.status) {
      switch (this.httpError.response.status) {
        case 400: return this.message = 'An error occurred with your request, please contact support with more information';
        case 403: return this.message = 'You don\'t have permission to perform that action';
        case 404: return this.message = 'That record cannot be found';
        case 422: return this.message = 'Error saving record';
        default: return this.message = UNKNOWN_ERROR;
      }
    }
    return this.message = UNKNOWN_ERROR;
  }
}
