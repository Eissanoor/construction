const sendSuccess = (res, statusCode, message, data) => {
  return res.status(statusCode).json({
    status: true,
    message,
    data,
  });
};

const sendError = (res, statusCode, message, errors) => {
  const body = {
    status: false,
    message,
    data: null,
  };

  if (Array.isArray(errors) && errors.length > 0) {
    body.errors = errors;
  }

  return res.status(statusCode).json(body);
};

module.exports = { sendSuccess, sendError };
