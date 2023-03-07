"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const defined_error_1 = require("../errors/defined-error");
const errorHandler = (err, req, res, next) => {
    if (err instanceof defined_error_1.DefinedError) {
        return res.status(err.statusCode).send({ errors: err.response() });
    }
    // unexpected error happened
    res.status(400).send({
        errors: [{ message: "An unexpected error happened", field: err.message }],
    });
};
exports.errorHandler = errorHandler;
