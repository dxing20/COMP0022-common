export abstract class DefinedError extends Error {
  abstract statusCode: number;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, DefinedError.prototype);
  }

  abstract response(): { message: string; field?: string }[];
}
