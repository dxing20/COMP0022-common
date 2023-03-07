interface CustomJwtPayload {
    username: string;
}
declare global {
    namespace Express {
        interface Request {
            jwtPayload?: CustomJwtPayload;
        }
    }
}
export { CustomJwtPayload };
