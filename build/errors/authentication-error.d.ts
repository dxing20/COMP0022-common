import { DefinedError } from "./defined-error";
export declare class AuthenticationError extends DefinedError {
    statusCode: number;
    reason: string;
    constructor(reason: string);
    response(): {
        message: string;
        field: string;
    }[];
}
