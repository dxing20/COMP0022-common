import { DefinedError } from './defined-error';
export declare class PageNotFoundError extends DefinedError {
    statusCode: number;
    expectedRoute: string;
    constructor(expectedRoute: string);
    response(): {
        message: string;
        field: string;
    }[];
}
