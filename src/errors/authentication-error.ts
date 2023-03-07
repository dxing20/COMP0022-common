import { DefinedError } from "./defined-error";

export class AuthenticationError extends DefinedError {
  statusCode = 404;
  reason: string;

  constructor(reason: string) {
    super("Authentication failed");
    Object.setPrototypeOf(this, AuthenticationError.prototype);
    this.reason = reason;
  }

  response() {
    return [{ message: "Authentication error", field: this.reason }];
  }
}
