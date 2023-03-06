import { Request, Response, NextFunction } from "express";
import { DefinedError } from "../errors/defined-error";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof DefinedError) {
    return res.status(err.statusCode).send({ errors: err.response() });
  }

  // unexpected error happened
  res.status(400).send({
    errors: [{ message: "An unexpected error happened", field: err.message }],
  });
};
