function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors,
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Unique constraint violation',
      meta: err.meta,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  const status = err.status || err.statusCode || 500;
  const payload = {
    error: status === 500 ? 'Internal server error' : err.message,
  };

  if (process.env.NODE_ENV === 'development' && status === 500) {
    payload.message = err.message;
  }

  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(status).json(payload);
}

module.exports = { errorHandler };
