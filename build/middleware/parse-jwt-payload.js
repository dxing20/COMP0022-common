"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userFromJwt = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authentication_error_1 = require("../errors/authentication-error");
const userFromJwt = (req, res, next) => {
    var _a;
    if (!((_a = req.session) === null || _a === void 0 ? void 0 : _a.jwt)) {
        return next();
    }
    try {
        const payload = jsonwebtoken_1.default.verify(req.session.jwt, process.env.JWT_KEY);
        req.jwtPayload = payload;
    }
    catch (err) {
        throw new authentication_error_1.AuthenticationError("Failed to verify authentication token");
    }
    next();
};
exports.userFromJwt = userFromJwt;
