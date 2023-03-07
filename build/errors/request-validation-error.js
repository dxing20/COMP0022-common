"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestValidationError = void 0;
const defined_error_1 = require("./defined-error");
class RequestValidationError extends defined_error_1.DefinedError {
    constructor(validationErrors) {
        super("The page you are looking for does not exist");
        this.statusCode = 400;
        Object.setPrototypeOf(this, RequestValidationError.prototype);
        this.validationErrors = validationErrors;
    }
    response() {
        return this.validationErrors;
    }
}
exports.RequestValidationError = RequestValidationError;
