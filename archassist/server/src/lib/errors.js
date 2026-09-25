export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(400, 'Validation failed', result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    })));
  }
  return result.data;
}
