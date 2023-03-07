import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticationError } from "../errors/authentication-error";
import { CustomJwtPayload } from "../interface/jwt-payload";

declare global {
  namespace Express {
    interface Request {
      jwtPayload?: CustomJwtPayload;
    }
  }
}

export const parseJwtPayload = (
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
