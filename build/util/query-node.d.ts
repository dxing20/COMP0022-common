import { SQLQuery } from "./sql-query";
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
    generateEdge(otherNodes: GraphNode[]): any;
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
    generateEdge(otherNodes: GraphNode[]): any;
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
    generateEdge(otherNodes: GraphNode[]): any;
}
