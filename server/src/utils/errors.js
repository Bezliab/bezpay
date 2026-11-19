// TODO: Implement this module.
export class AppError extends Error {
  constructor(status, message, code = "APP_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class MonnifyError extends Error {
  constructor(message, { code, status, cause } = {}) {
    super(message);
    this.name = "MonnifyError";
    this.monnifyCode = code;
    this.httpStatus = status;
    this.cause = cause;
  }
}
