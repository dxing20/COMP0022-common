declare enum SQLQueryParts {
    FROM = 0,
    WHERE = 1,
    GROUP_BY = 2,
    HAVING = 3,
    SELECT = 4,
    ORDER_BY = 5,
    LIMIT = 6
}
export declare enum Compare {
    EQUAL = "=",
    NOT_EQUAL = "!=",
    GREATER_THAN = ">",
    GREATER_THAN_OR_EQUAL = ">=",
    LESS_THAN = "<",
    LESS_THAN_OR_EQUAL = "<=",
    LIKE = "LIKE",
    NOT_LIKE = "NOT LIKE"
}
export declare enum Order {
    ASC = "ASC",
    DESC = "DESC"
}
export declare enum Aggregate {
    SUM = "SUM",
    AVG = "AVG",
    MIN = "MIN",
    MAX = "MAX",
    COUNT = "COUNT"
}
declare class SQLQuery {
    columns: {
        name: string;
        as: string;
    }[];
    from: {
        join: string | undefined;
        isIndex1: boolean;
        tableName1: string;
        isIndex2: boolean;
        tableName2: string;
        on1: string;
        on2: string;
    };
    where: {
        column: string;
        compare: Compare;
        value: any;
    }[];
    groupBy: {
        groupColumn: string;
        aggregateColumn: string;
        aggregate: Aggregate;
    } | undefined;
    having: string[][];
    orderBy: {
        order: Order;
        column: string;
    }[];
    limit: number | undefined;
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
    private resolveWhere;
    private resolveOrderBy;
    private resolveAggregate;
    private resolveLimit;
    canContain(part: SQLQueryParts): boolean;
}
export { SQLQuery, SQLQueryParts };
