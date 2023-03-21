import { SQLQuery } from "./sql-query";
export declare class RuntimeQueryHandler {
    queryTableNames: () => Promise<string[]>;
    queryColumns: (tableName: string) => Promise<string[]>;
    constructor(queryTableNames: () => Promise<string[]>, queryColumns: (tableName: string) => Promise<string[]>);
}
export declare class Graph {
    i: number;
    nodes: GraphNode[];
    root: RootNode | undefined;
    queryHandler: RuntimeQueryHandler;
    constructor(queryHandler: RuntimeQueryHandler);
    clientRefresh(): Promise<void>;
    addDataNode(tableName: string): void;
    addRootNode(): void;
    getGraph(): {
        nodes: any[];
        edges: any[];
    };
    clone(): Graph;
}
export declare enum ClientStatus {
    CHILD_UNRESOLVED = 0,
    RESOLVED = 1,
    ERROR = 2
}
export declare class GraphNode {
    id: number;
    status: ClientStatus;
    error: string | undefined;
    hasParent: boolean;
    depth: number;
    columns: string[];
    constructor(id: number);
    getChildren(): GraphNode[];
    resolve(tableNames: string[], queryHandler: RuntimeQueryHandler): Promise<{
        sqlQuery: SQLQuery | undefined;
    }>;
    generateNode(freq: number[]): any;
    generateEdge(): any;
}
export declare class DataNode implements GraphNode {
    tableName: string;
    id: number;
    status: ClientStatus;
    depth: number;
    error: string | undefined;
    hasParent: boolean;
    columns: string[];
    constructor(id: number, tableName: string);
    resolve(tableNames: string[], queryHandler: RuntimeQueryHandler): Promise<{
        sqlQuery: SQLQuery | undefined;
    }>;
    getChildren(): GraphNode[];
    generateNode(freq: number[]): any;
    generateEdge(): any;
}
export declare class RootNode implements GraphNode {
    id: number;
    status: ClientStatus;
    error: string | undefined;
    depth: number;
    child: GraphNode;
    hasParent: boolean;
    columns: string[];
    constructor(id: number, child: GraphNode);
    getChildren(): GraphNode[];
    resolve(tableNames: string[], queryHandler: RuntimeQueryHandler): Promise<{
        sqlQuery: SQLQuery | undefined;
    }>;
    generateNode(freq: number[]): any;
    generateEdge(): any;
}
