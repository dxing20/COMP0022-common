import { Request, Response, NextFunction } from "express";
import { CustomJwtPayload } from "../interface/jwt-payload";
declare global {
    namespace Express {
        interface Request {
            jwtPayload?: CustomJwtPayload;
        }
    }
}
export declare const parseJwtPayload: (req: Request, res: Response, next: NextFunction) => void;
