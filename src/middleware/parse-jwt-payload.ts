import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticationError } from "../errors/authentication-error";
import { CustomJwtPayload } from "../interface/jwt-payload";

export const userFromJwt = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session?.jwt) {
    return next();
  }

  try {
    const payload = jwt.verify(
      req.session.jwt,
      process.env.JWT_KEY!
    ) as CustomJwtPayload;
    req.jwtPayload = payload;
  } catch (err) {
    throw new AuthenticationError("Failed to verify authentication token");
  }

  next();
};
