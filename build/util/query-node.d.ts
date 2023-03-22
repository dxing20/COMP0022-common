import { Aggregate, Compare, Order, SQLQuery } from "./sql-query";
export declare enum NodeType {
    ROOT = 0,
    DATA = 1,
    OTHER = 2,
    JOIN = 3,
    FILTER = 4,
    AGGREGATE = 5,
    SORT = 6,
    LIMIT = 7,
    SELECT = 8
}
export declare class RuntimeQueryHandler {
    queryTableNames: () => Promise<string[]>;
    queryColumns: (tableName: string) => Promise<string[]>;
    constructor(queryTableNames: () => Promise<string[]>, queryColumns: (tableName: string) => Promise<string[]>);
}
export declare class Graph {
    i: number;
    nodes: GraphNode[];
    root: number | undefined;
    queryHandler: RuntimeQueryHandler;
    constructor(queryHandler: RuntimeQueryHandler);
    clientRefresh(): Promise<void>;
    resolveRootQuery(): Promise<SQLQuery | undefined>;
    addDataNode(tableName: string): void;
    addRootNode(): void;
    addJoinNode(child1: number, child2: number, joinType: JoinType, on1: string, on2: string): void;
    addFilterNode(child: number, column: string, compare: Compare, value: string): void;
    addSortNode(child: number, sortOrder: {
        column: string;
        order: Order;
    }[]): void;
    addAggregateNode(child: number, aggregate: Aggregate, groupColumn: string, aggregateColumn: string): void;
    getGraph(): {
        nodes: any[];
        edges: any[];
    };
}
export declare const cloneGraph: (graph: Graph) => Graph;
export declare enum ClientStatus {
    CHILD_UNRESOLVED = 0,
    RESOLVED = 1,
    ERROR = 2
}
export declare class GraphNode {
    id: number;
    type: NodeType;
    status: ClientStatus;
    error: string | undefined;
    hasParent: boolean;
    depth: number;
    columns: string[];
    constructor(id: number);
    resolve(tableNames: string[], queryHandler: RuntimeQueryHandler, otherNodes: GraphNode[]): Promise<{
        sqlQuery: SQLQuery | undefined;
    }>;
    generateNode(freq: number[]): any;
    generateEdge(otherNodes: GraphNode[]): any[];
}
export declare class DataNode implements GraphNode {
    tableName: string;
    type: NodeType;
    id: number;
    status: ClientStatus;
    depth: number;
    error: string | undefined;
    hasParent: boolean;
    columns: string[];
    constructor(id: number, tableName: string);
    resolve(tableNames: string[], queryHandler: RuntimeQueryHandler, otherNodes: GraphNode[]): Promise<{
        sqlQuery: SQLQuery | undefined;
    }>;
    generateNode(freq: number[]): any;
    generateEdge(otherNodes: GraphNode[]): any[];
}
export declare class RootNode implements GraphNode {
    id: number;
    type: NodeType;
    status: ClientStatus;
    error: string | undefined;
    depth: number;
    child: number;
    hasParent: boolean;
    columns: string[];
    constructor(id: number, child: number);
    resolve(tableNames: string[], queryHandler: RuntimeQueryHandler, otherNodes: GraphNode[]): Promise<{
        sqlQuery: SQLQuery | undefined;
    }>;
    generateNode(freq: number[]): any;
    generateEdge(otherNodes: GraphNode[]): any[];
}
export declare enum JoinType {
    INNER = "INNER JOIN",
    LEFT = "LEFT JOIN",
    RIGHT = "RIGHT JOIN",
    FULL = "FULL JOIN"
}
export declare class JoinNode implements GraphNode {
    id: number;
    type: NodeType;
    status: ClientStatus;
    error: string | undefined;
    depth: number;
    child1: number;
    child2: number;
    hasParent: boolean;
    columns: string[];
    joinType: JoinType;
    on1: string;
    on2: string;
    constructor(id: number, child1: number, child2: number, joinType: JoinType, on1: string, on2: string);
    resolve(tableNames: string[], queryHandler: RuntimeQueryHandler, otherNodes: GraphNode[]): Promise<{
        sqlQuery: SQLQuery | undefined;
    }>;
    generateNode(freq: number[]): any;
    generateEdge(otherNodes: GraphNode[]): any[];
}
export declare class FilterNode implements GraphNode {
    id: number;
    type: NodeType;
    status: ClientStatus;
    error: string | undefined;
    depth: number;
    child: number;
    hasParent: boolean;
    columns: string[];
    compare: Compare;
    selectedColumn: string;
    value: any;
    constructor(id: number, child: number, compare: Compare, selectedColumn: string, value: any);
    resolve(tableNames: string[], queryHandler: RuntimeQueryHandler, otherNodes: GraphNode[]): Promise<{
        sqlQuery: SQLQuery | undefined;
    }>;
    generateNode(freq: number[]): any;
    generateEdge(otherNodes: GraphNode[]): any[];
}
export declare class SortNode implements GraphNode {
    id: number;
    type: NodeType;
    status: ClientStatus;
    error: string | undefined;
    depth: number;
    child: number;
    hasParent: boolean;
    columns: string[];
    sortOrder: {
        column: string;
        order: Order;
    }[];
    constructor(id: number, child: number, sortOrder: {
        column: string;
        order: Order;
    }[]);
    resolve(tableNames: string[], queryHandler: RuntimeQueryHandler, otherNodes: GraphNode[]): Promise<{
        sqlQuery: SQLQuery | undefined;
    }>;
    generateNode(freq: number[]): any;
    generateEdge(otherNodes: GraphNode[]): any[];
}
export declare class AggregateNode implements GraphNode {
    id: number;
    type: NodeType;
    status: ClientStatus;
    error: string | undefined;
    depth: number;
    child: number;
    hasParent: boolean;
    columns: string[];
    aggregate: Aggregate;
    groupColumn: string;
    aggregateColumn: string;
    constructor(id: number, child: number, aggregate: Aggregate, groupColumn: string, aggregateColumn: string);
    resolve(tableNames: string[], queryHandler: RuntimeQueryHandler, otherNodes: GraphNode[]): Promise<{
        sqlQuery: SQLQuery | undefined;
    }>;
    generateNode(freq: number[]): any;
    generateEdge(otherNodes: GraphNode[]): any[];
}
