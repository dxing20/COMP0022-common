import { DefinedError } from "./defined-error";
export declare class RequestValidationError extends DefinedError {
    statusCode: number;
    validationErrors: {
        message: string;
        field: string;
    }[];
    constructor(validationErrors: {
        message: string;
        field: string;
    }[]);
    response(): {
        message: string;
        field: string;
    }[];
}
