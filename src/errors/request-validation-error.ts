import { ValidationError } from "express-validator";
import { DefinedError } from "./defined-error";

export class RequestValidationError extends DefinedError {
  statusCode = 400;
  validationErrors: { message: string; field: string }[];

  constructor(validationErrors: { message: string; field: string }[]) {
    super("The page you are looking for does not exist");
    Object.setPrototypeOf(this, RequestValidationError.prototype);
    this.validationErrors = validationErrors;
  }

  response() {
    return this.validationErrors;
  }
}
