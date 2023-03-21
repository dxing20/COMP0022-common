import { SQLQuery } from "./sql-query";
declare class RuntimeQueryHandler {
    queryTableNames: () => Promise<string[]>;
    queryColumns: (tableName: string) => Promise<string[]>;
    constructor(queryTableNames: () => Promise<string[]>, queryColumns: (tableName: string) => Promise<string[]>);
}
declare class Graph {
    i: number;
    nodes: GraphNode[];
    root: RootNode | undefined;
    queryHandler: RuntimeQueryHandler;
    constructor(queryHandler: RuntimeQueryHandler);
    clientRefresh(): Promise<void>;
    addDataNode(tableName: string): void;
    addRootNode(): void;
}
declare enum ClientStatus {
    CHILD_UNRESOLVED = 0,
    RESOLVED = 1,
    ERROR = 2
}
declare class GraphNode {
    id: number;
    status: ClientStatus;
    error: string | undefined;
    hasParent: boolean;
    columns: string[];
    constructor(id: number);
    getChildren(): GraphNode[];
    clientResolve(tableNames: string[], queryHandler: RuntimeQueryHandler): Promise<{
        sqlQuery: SQLQuery | undefined;
    }>;
}
declare class DataNode implements GraphNode {
    tableName: string;
    id: number;
    status: ClientStatus;
    error: string | undefined;
    hasParent: boolean;
    columns: string[];
    constructor(id: number, tableName: string);
    clientResolve(tableNames: string[], queryHandler: RuntimeQueryHandler): Promise<{
        sqlQuery: SQLQuery | undefined;
    }>;
    queryResolve(): {
        name: string;
        columns: string[];
        sqlQuery: SQLQuery;
    };
    getChildren(): GraphNode[];
}
declare class RootNode implements GraphNode {
    id: number;
    status: ClientStatus;
    error: string | undefined;
    child: GraphNode;
    hasParent: boolean;
    columns: string[];
    constructor(id: number, child: GraphNode);
    getChildren(): GraphNode[];
    clientResolve(tableNames: string[], queryHandler: RuntimeQueryHandler): Promise<{
        sqlQuery: SQLQuery | undefined;
    }>;
}
export { Graph, GraphNode, DataNode, RootNode, ClientStatus };
