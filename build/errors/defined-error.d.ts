export declare abstract class DefinedError extends Error {
    abstract statusCode: number;
    constructor(message: string);
    abstract response(): {
        message: string;
        field?: string;
    }[];
}
