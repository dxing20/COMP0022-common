declare enum SQLQueryParts {
    FROM = 0,
    WHERE = 1,
    GROUP_BY = 2,
    HAVING = 3,
    SELECT = 4,
    ORDER_BY = 5,
    LIMIT = 6
}
declare class SQLQuery {
    columns: string[];
    from: {
        join: string | undefined;
        isIndex1: boolean;
        tableName1: string;
        isIndex2: boolean;
        tableName2: string;
        on1: string;
        on2: string;
    };
    where: string[][];
    groupBy: string;
    having: string[][];
    orderBy: string[];
    limit: number;
    with: {
        subQuery: SQLQuery;
    }[];
    currentPart: SQLQueryParts;
    paramIdCount: number;
    withIdCount: number;
    constructor(from: {
        join: string | undefined;
        isIndex1: boolean;
        tableName1: string;
        isIndex2: boolean;
        tableName2: string;
        on1: string;
        on2: string;
    });
    private joinLogicStatements;
    private checkTableName;
    resolve({ verifiedTableNames }: {
        verifiedTableNames: Set<string>;
    }): {
        text: string;
        params: string[];
    };
    private resolveFrom;
    private resolveWith;
    private resolveSelect;
    canContain(part: SQLQueryParts): boolean;
}
export { SQLQuery, SQLQueryParts };
