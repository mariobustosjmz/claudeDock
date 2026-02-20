export class AppError extends Error {
  readonly code: string;
  readonly originalCause: unknown;

  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.originalCause = cause;
  }
}
