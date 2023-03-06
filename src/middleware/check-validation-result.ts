import { NextFunction } from "express";
import { validationResult } from "express-validator";
import { RequestValidationError } from "../errors/request-validation-error";

export const checkValidationResult = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req).formatWith(({ msg, param }) => {
    return { message: String(msg), field: param };
  });
  if (!errors.isEmpty()) {
    throw new RequestValidationError(errors.array());
  }
  next();
};
