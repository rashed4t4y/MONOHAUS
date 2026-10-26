export class HttpError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}
export function assert(condition, status, message, fields) { if (!condition) throw new HttpError(status, message, fields); }
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request body must be valid JSON.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'This request is too large.' });
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(`[MONOHAUS] ${error.name}: ${error.message}`);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong. Please try again.' : error.message, ...(error.fields ? { fields: error.fields } : {}) });
}
