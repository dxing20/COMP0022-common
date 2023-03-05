"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageNotFoundError = void 0;
const defined_error_1 = require("./defined-error");
class PageNotFoundError extends defined_error_1.DefinedError {
    constructor(expectedRoute) {
        super('The page you are looking for does not exist');
        this.statusCode = 404;
        Object.setPrototypeOf(this, PageNotFoundError.prototype);
        this.expectedRoute = expectedRoute;
    }
    response() {
        return [{ message: 'Cannot find page at requested route', field: this.expectedRoute }];
    }
}
exports.PageNotFoundError = PageNotFoundError;
