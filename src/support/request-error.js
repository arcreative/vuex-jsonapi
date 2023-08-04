import get from '../lib/get'

const UNKNOWN_ERROR = 'An error occurred with your request, please try again momentarily';

export default class RequestError extends Error {

  constructor(httpError, { record = null, customMessage = null } = {}) {
    super();
    Object.assign(this, { record, customMessage, httpError });
    this.message = customMessage || this._getMessageFromHttpError();
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

  attributeErrors() {
    let ret = {};
    this.errors().map(error => {
      if (error && error.code === '100') {
        ret[error.source.pointer.split('/').pop()] = error.title;
      }
    });
    return ret;
  }

  _getMessageFromHttpError() {
    if (this.httpError && this.httpError.response && this.httpError.response.status) {
      switch (this.httpError.response.status) {
        case 400: return 'An error occurred with your request, please contact support with more information';
        case 401: return 'Please log in to continue';
        case 403: return 'You don\'t have permission to perform that action';
        case 404: return 'That record cannot be found';
        case 422: return 'Error saving record';
        default: return UNKNOWN_ERROR;
      }
    }
    return UNKNOWN_ERROR;
  }
}
