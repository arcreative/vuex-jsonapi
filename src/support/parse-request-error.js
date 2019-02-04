const DEFAULT_ERROR = 'An error occurred with your request, support has been notified';

export default (e) => {
  let context = {
    error: e,
    message: null,
  };
  if (e && e.response && e.response.status) {
    switch (e.response.status) {
      case 400:
        context.message = DEFAULT_ERROR;
        break;
      default:
        context.message = DEFAULT_ERROR;
    }
  } else {
    context.message = DEFAULT_ERROR;
  }
  return context;
}
