"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationError = void 0;
const defined_error_1 = require("./defined-error");
class AuthenticationError extends defined_error_1.DefinedError {
    constructor(reason) {
        super("Authentication failed");
        this.statusCode = 403;
        Object.setPrototypeOf(this, AuthenticationError.prototype);
        this.reason = reason;
    }
    response() {
        return [{ message: this.reason }];
    }
}
exports.AuthenticationError = AuthenticationError;
