"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefinedError = void 0;
class DefinedError extends Error {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, DefinedError.prototype);
    }
}
exports.DefinedError = DefinedError;
